import { Queue, Worker, QueueEvents, Job } from "bullmq";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { instagramService } from "../services/instagram.service";
import { analyzeNiche, calculateLeadScore, detectEngagementAnomalies } from "../services/ai.service";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
};

// ─── Queues ───────────────────────────────────────────────────────────────────
export const discoveryQueue = new Queue("discovery", { connection });
export const analysisQueue = new Queue("analysis", { connection });
export const exportQueue = new Queue("export", { connection });

// ─── Discovery Worker ─────────────────────────────────────────────────────────
const discoveryWorker = new Worker(
  "discovery",
  async (job: Job) => {
    const { jobId, params } = job.data;
    logger.info(`Starting discovery job: ${jobId}`);

    // Update job status
    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      const {
        hashtags = [],
        keywords = [],
        minFollowers = 1000,
        maxFollowers = 100000,
        minEngagement = 0,
      } = params;

      const discoveredUsernames = new Set<string>();
      let totalProcessed = 0;

      // Search by hashtags
      for (const hashtag of hashtags) {
        try {
          const results = await instagramService.searchByHashtag(hashtag);

          for (const profile of results.profiles) {
            if (!profile.username) continue;
            if (discoveredUsernames.has(profile.username)) continue;

            // Quick follower pre-filter
            if (
              profile.followersCount !== undefined &&
              !instagramService.meetsFollowerCriteria(
                profile.followersCount,
                minFollowers,
                maxFollowers
              )
            ) {
              continue;
            }

            discoveredUsernames.add(profile.username);
          }

          await job.updateProgress(
            Math.round((hashtags.indexOf(hashtag) / hashtags.length) * 40)
          );
        } catch (err) {
          logger.warn(`Failed to search hashtag: ${hashtag}`, { err });
        }
      }

      // Fetch full profiles for discovered accounts
      const usernameList = Array.from(discoveredUsernames);
      let savedCount = 0;

      for (let i = 0; i < usernameList.length; i++) {
        const username = usernameList[i];

        try {
          const fullProfile = await instagramService.getProfile(username);
          if (!fullProfile) continue;

          // Apply all filters
          if (
            !instagramService.meetsFollowerCriteria(
              fullProfile.followersCount,
              minFollowers,
              maxFollowers
            )
          ) continue;

          if (fullProfile.isPrivate) continue;

          // Calculate metrics
          const engagementRate = instagramService.calculateEngagementRate(fullProfile);
          if (engagementRate < minEngagement) continue;

          const postFrequency = instagramService.calculatePostFrequency(fullProfile.recentPosts);
          const topHashtags = instagramService.extractHashtags(fullProfile.recentPosts);

          // Detect engagement anomalies
          const anomalies = detectEngagementAnomalies({
            followersCount: fullProfile.followersCount,
            avgLikes: fullProfile.recentPosts.reduce((s, p) => s + p.likesCount, 0) / (fullProfile.recentPosts.length || 1),
            avgComments: fullProfile.recentPosts.reduce((s, p) => s + p.commentsCount, 0) / (fullProfile.recentPosts.length || 1),
            engagementRate,
          });

          if (anomalies.isSuspicious) {
            logger.debug(`Suspicious profile skipped: ${username}`, { flags: anomalies.flags });
            continue;
          }

          // Quick lead score (before AI analysis)
          const leadScoreResult = calculateLeadScore({
            followersCount: fullProfile.followersCount,
            engagementRate,
            postFrequency,
            isVerified: fullProfile.isVerified,
            hasBio: Boolean(fullProfile.bio),
            hasWebsite: Boolean(fullProfile.website),
          });

          // Save to database (upsert)
          const savedProfile = await prisma.profile.upsert({
            where: { instagramId: fullProfile.instagramId || username },
            create: {
              instagramId: fullProfile.instagramId || username,
              username: fullProfile.username,
              fullName: fullProfile.fullName,
              bio: fullProfile.bio,
              website: fullProfile.website,
              profilePicUrl: fullProfile.profilePicUrl,
              followersCount: fullProfile.followersCount,
              followingCount: fullProfile.followingCount,
              postsCount: fullProfile.postsCount,
              engagementRate,
              postFrequency,
              isVerified: fullProfile.isVerified,
              isPrivate: fullProfile.isPrivate,
              leadScore: leadScoreResult.score,
              leadTier: leadScoreResult.tier,
              discoveryJobId: jobId,
              dataFetchedAt: new Date(),
            },
            update: {
              followersCount: fullProfile.followersCount,
              engagementRate,
              leadScore: leadScoreResult.score,
              leadTier: leadScoreResult.tier,
              dataFetchedAt: new Date(),
            },
          });

          // Save recent posts
          if (fullProfile.recentPosts.length > 0) {
            await Promise.allSettled(
              fullProfile.recentPosts.map((post) =>
                prisma.post.upsert({
                  where: { instagramPostId: post.instagramPostId },
                  create: {
                    profileId: savedProfile.id,
                    instagramPostId: post.instagramPostId,
                    type: post.type,
                    caption: post.caption,
                    hashtags: post.hashtags,
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                    viewsCount: post.viewsCount,
                    postedAt: post.postedAt ? new Date(post.postedAt) : null,
                  },
                  update: {
                    likesCount: post.likesCount,
                    commentsCount: post.commentsCount,
                  },
                })
              )
            );
          }

          // Queue AI analysis for high-potential leads
          if (leadScoreResult.score >= 40) {
            await analysisQueue.add(
              "ai-analysis",
              {
                profileId: savedProfile.id,
                username: fullProfile.username,
                bio: fullProfile.bio,
                recentCaptions: fullProfile.recentPosts.map((p) => p.caption).filter(Boolean),
                topHashtags,
              },
              { delay: 2000, attempts: 2 }
            );
          }

          savedCount++;
          totalProcessed++;

          // Update progress
          const progress = 40 + Math.round((i / usernameList.length) * 55);
          await job.updateProgress(progress);

          // Update job stats
          await prisma.discoveryJob.update({
            where: { id: jobId },
            data: { totalFound: savedCount, processed: totalProcessed },
          });
        } catch (err: any) {
          logger.warn(`Failed to process profile: ${username}`, { error: err.message });
          await prisma.discoveryJob.update({
            where: { id: jobId },
            data: { failed: { increment: 1 } },
          });
        }
      }

      // Complete job
      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          totalFound: savedCount,
          processed: totalProcessed,
        },
      });

      // Update user quota
      await prisma.user.update({
        where: { id: job.data.userId },
        data: { usedQuota: { increment: savedCount } },
      });

      logger.info(`Discovery job completed: ${jobId}`, { savedCount, totalProcessed });
      return { savedCount, totalProcessed };
    } catch (error: any) {
      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorMessage: error.message },
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: { max: 10, duration: 60000 },
  }
);

// ─── AI Analysis Worker ───────────────────────────────────────────────────────
const analysisWorker = new Worker(
  "analysis",
  async (job: Job) => {
    const { profileId, username, bio, recentCaptions, topHashtags } = job.data;

    try {
      const nicheResult = await analyzeNiche({
        username,
        bio: bio || "",
        recentCaptions: recentCaptions || [],
        hashtags: topHashtags || [],
      });

      const profile = await prisma.profile.findUnique({ where: { id: profileId } });
      if (!profile) return;

      const fullLeadScore = calculateLeadScore({
        followersCount: profile.followersCount,
        engagementRate: profile.engagementRate,
        postFrequency: profile.postFrequency,
        isVerified: profile.isVerified,
        hasBio: Boolean(profile.bio),
        hasWebsite: Boolean(profile.website),
        niche: nicheResult.primaryNiche,
        audienceSentiment: nicheResult.audienceSentiment,
        brandSafetyScore: nicheResult.brandSafetyScore,
      });

      await prisma.profile.update({
        where: { id: profileId },
        data: {
          niche: nicheResult.primaryNiche,
          subNiches: nicheResult.subNiches,
          contentThemes: nicheResult.contentThemes,
          audienceSentiment: nicheResult.audienceSentiment,
          brandSafetyScore: nicheResult.brandSafetyScore,
          leadScore: fullLeadScore.score,
          leadTier: fullLeadScore.tier,
          lastAnalyzedAt: new Date(),
        },
      });

      logger.info(`AI analysis complete for ${username}`, {
        niche: nicheResult.primaryNiche,
        score: fullLeadScore.score,
      });
    } catch (error: any) {
      logger.error(`AI analysis failed for ${username}`, { error: error.message });
      throw error;
    }
  },
  { connection, concurrency: 3 }
);

// ─── Export Worker ────────────────────────────────────────────────────────────
const exportWorker = new Worker(
  "export",
  async (job: Job) => {
    const { exportJobId, userId, format, filters } = job.data;
    const { exportService } = await import("../services/export.service");

    try {
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: "RUNNING" },
      });

      const { fileUrl, recordCount } = await exportService.generateExport({
        exportJobId,
        userId,
        format,
        filters,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: {
          status: "COMPLETED",
          fileUrl,
          recordCount,
          completedAt: new Date(),
          expiresAt,
        },
      });
    } catch (error: any) {
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: "FAILED" },
      });
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

// Worker event handlers
[discoveryWorker, analysisWorker, exportWorker].forEach((worker) => {
  worker.on("failed", (job, err) => {
    logger.error(`Worker job failed: ${job?.id}`, { error: err.message });
  });
  worker.on("error", (err) => {
    logger.error("Worker error:", err);
  });
});

export async function initializeQueues(): Promise<void> {
  logger.info("Job queues initialized", {
    queues: ["discovery", "analysis", "export"],
  });
}

export { discoveryWorker, analysisWorker, exportWorker };
