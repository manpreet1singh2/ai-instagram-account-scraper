import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...\n");

  const adminHash = await bcrypt.hash("Admin@12345", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@igintel.io" }, update: {},
    create: { email: "admin@igintel.io", passwordHash: adminHash, name: "Admin", role: "ADMIN", plan: "ENTERPRISE", monthlyQuota: 99999 },
  });

  const demoHash = await bcrypt.hash("Demo@12345", 12);
  const demo = await prisma.user.upsert({
    where: { email: "demo@igintel.io" }, update: {},
    create: { email: "demo@igintel.io", passwordHash: demoHash, name: "Demo User", role: "USER", plan: "PRO", monthlyQuota: 10000 },
  });

  const job = await prisma.discoveryJob.upsert({
    where: { id: "seed-job-001" }, update: {},
    create: { id: "seed-job-001", userId: demo.id, status: "COMPLETED", hashtags: ["fitness","foodie","travel"], keywords: ["lifestyle blogger"], minFollowers: 5000, maxFollowers: 100000, minEngagement: 1, totalFound: 5, processed: 5, startedAt: new Date(), completedAt: new Date() },
  });

  const profiles = [
    { instagramId: "sample001", username: "fitlife_sarah", fullName: "Sarah Johnson", bio: "Certified trainer | Nutrition tips | Daily workouts", website: "https://fitlifesarah.com", followersCount: 48200, followingCount: 891, postsCount: 312, engagementRate: 5.8, postFrequency: 4.2, niche: "Fitness & Workout", subNiches: ["Nutrition","Weight Loss"], contentThemes: ["Workouts","Meal Prep","Motivation"], audienceSentiment: 0.91, brandSafetyScore: 0.96, leadScore: 88, leadTier: "QUALIFIED" as const, isVerified: false },
    { instagramId: "sample002", username: "foodie_adventures_mk", fullName: "Mike Chen", bio: "Food explorer | Restaurant reviews | Home cooking", website: "https://foodieadventures.blog", followersCount: 22800, followingCount: 1204, postsCount: 198, engagementRate: 4.2, postFrequency: 3.1, niche: "Food & Cooking", subNiches: ["Restaurants","Home Cooking"], contentThemes: ["Restaurant Tours","Recipes"], audienceSentiment: 0.87, brandSafetyScore: 0.93, leadScore: 74, leadTier: "HOT" as const, isVerified: false },
    { instagramId: "sample003", username: "travel_tales_priya", fullName: "Priya Sharma", bio: "52 countries & counting | Solo female traveler", website: "https://traveltalespriya.com", followersCount: 67500, followingCount: 2341, postsCount: 524, engagementRate: 3.9, postFrequency: 5.8, niche: "Travel & Adventure", subNiches: ["Budget Travel","Solo Travel"], contentThemes: ["Destinations","Tips","Culture"], audienceSentiment: 0.89, brandSafetyScore: 0.94, leadScore: 82, leadTier: "QUALIFIED" as const, isVerified: true },
    { instagramId: "sample004", username: "techreview_alex", fullName: "Alex Rodriguez", bio: "Tech reviewer | Gadget unboxings | Honest opinions", website: "https://youtube.com/@techreviewalex", followersCount: 12300, followingCount: 445, postsCount: 89, engagementRate: 2.1, postFrequency: 1.8, niche: "Technology & Gadgets", subNiches: ["Smartphones","Laptops"], contentThemes: ["Reviews","Comparisons"], audienceSentiment: 0.78, brandSafetyScore: 0.91, leadScore: 52, leadTier: "WARM" as const, isVerified: false },
    { instagramId: "sample005", username: "beauty_by_nina", fullName: "Nina Williams", bio: "MUA | Skincare obsessed | Tutorials every week", website: "https://beautybynina.co", followersCount: 35600, followingCount: 687, postsCount: 267, engagementRate: 6.4, postFrequency: 4.5, niche: "Beauty & Makeup", subNiches: ["Skincare","Tutorials"], contentThemes: ["Makeup Looks","Product Reviews"], audienceSentiment: 0.93, brandSafetyScore: 0.97, leadScore: 91, leadTier: "QUALIFIED" as const, isVerified: false },
  ];

  for (const p of profiles) {
    await prisma.profile.upsert({ where: { instagramId: p.instagramId }, update: {}, create: { ...p, discoveryJobId: job.id, dataFetchedAt: new Date(), lastAnalyzedAt: new Date() } });
    console.log("  Profile seeded: @" + p.username + " (score: " + p.leadScore + ")");
  }

  const fp = await prisma.profile.findFirst({ where: { instagramId: "sample001" } });
  if (fp) {
    await prisma.lead.upsert({
      where: { userId_profileId: { userId: demo.id, profileId: fp.id } }, update: {},
      create: { userId: demo.id, profileId: fp.id, status: "NEW", score: fp.leadScore, notes: "High-potential fitness influencer.", tags: ["fitness","high-priority"] },
    });
  }

  console.log("\n Admin: " + admin.email + " / Admin@12345");
  console.log(" Demo:  " + demo.email + "  / Demo@12345");
  console.log("\nSeeding complete!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
