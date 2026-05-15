import OpenAI from "openai";
import { logger } from "../config/logger";
import { cache } from "../config/redis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface NicheAnalysisResult {
  primaryNiche: string;
  subNiches: string[];
  contentThemes: string[];
  audienceSentiment: number; // 0-1
  brandSafetyScore: number; // 0-1
  confidence: number; // 0-1
}

export interface LeadScoreResult {
  score: number; // 0-100
  tier: "COLD" | "WARM" | "HOT" | "QUALIFIED";
  reasons: string[];
  recommendations: string[];
}

export interface ProfileAnalysis {
  nicheAnalysis: NicheAnalysisResult;
  leadScore: LeadScoreResult;
}

// 50+ Instagram niches
const INSTAGRAM_NICHES = [
  "Fashion & Style", "Beauty & Makeup", "Fitness & Workout", "Health & Wellness",
  "Food & Cooking", "Travel & Adventure", "Photography", "Art & Design",
  "Technology & Gadgets", "Gaming", "Music", "Dance", "Comedy & Entertainment",
  "Education & Learning", "Business & Entrepreneurship", "Finance & Investing",
  "Real Estate", "Parenting & Family", "Pets & Animals", "Nature & Environment",
  "Sports", "Yoga & Meditation", "DIY & Crafts", "Home & Interior Design",
  "Books & Literature", "Movies & TV", "Fashion Accessories", "Luxury & Lifestyle",
  "Streetwear", "Skincare", "Haircare", "Nail Art", "Tattoo & Body Art",
  "Vegan & Plant-Based", "Sustainable Living", "Mental Health", "Self Development",
  "Career & Productivity", "Marketing & Social Media", "Content Creation",
  "Podcasting", "Comedy Skits", "Couple Goals", "Wedding & Events",
  "Baby & Kids", "Automotive", "Architecture", "Vintage & Retro",
  "E-commerce & Dropshipping", "Crypto & NFT",
];

/**
 * AI-powered niche detection using GPT-4
 */
export async function analyzeNiche(profileData: {
  username: string;
  bio: string;
  recentCaptions: string[];
  hashtags: string[];
}): Promise<NicheAnalysisResult> {
  const cacheKey = `niche:${profileData.username}`;
  const cached = await cache.get<NicheAnalysisResult>(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `
You are an expert Instagram marketing analyst. Analyze this Instagram profile and classify its niche.

Username: @${profileData.username}
Bio: ${profileData.bio || "N/A"}
Recent Post Captions (sample): ${profileData.recentCaptions.slice(0, 5).join(" | ") || "N/A"}
Common Hashtags: ${profileData.hashtags.slice(0, 20).join(", ") || "N/A"}

Available niches: ${INSTAGRAM_NICHES.join(", ")}

Respond ONLY with valid JSON in this exact format:
{
  "primaryNiche": "string (one from the list above)",
  "subNiches": ["string array, 1-3 sub-niches"],
  "contentThemes": ["string array, 3-5 main content themes"],
  "audienceSentiment": 0.85,
  "brandSafetyScore": 0.90,
  "confidence": 0.88
}

Rules:
- audienceSentiment: 0-1 (how positive/engaged the audience is)
- brandSafetyScore: 0-1 (1 = completely brand safe, 0 = not brand safe)
- confidence: 0-1 (how confident you are in this classification)
- Be precise and data-driven`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0].message.content || "{}"
    ) as NicheAnalysisResult;

    // Cache for 24 hours
    await cache.set(cacheKey, result, 86400);

    return result;
  } catch (error) {
    logger.error("AI niche analysis failed", { error, username: profileData.username });

    // Fallback heuristic analysis
    return fallbackNicheAnalysis(profileData);
  }
}

/**
 * Calculate lead score based on multiple factors
 */
export function calculateLeadScore(profile: {
  followersCount: number;
  engagementRate: number;
  postFrequency: number;
  isVerified: boolean;
  hasBio: boolean;
  hasWebsite: boolean;
  niche?: string;
  audienceSentiment?: number;
  brandSafetyScore?: number;
}): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];

  // ── Follower Score (0-25 points) ──────────────────────────────
  const { followersCount } = profile;
  if (followersCount >= 10000 && followersCount <= 100000) {
    score += 25;
    reasons.push("Sweet spot follower count (10K-100K)");
  } else if (followersCount >= 5000) {
    score += 18;
    reasons.push("Good follower count (5K-10K)");
  } else if (followersCount >= 1000) {
    score += 10;
    reasons.push("Growing account (1K-5K followers)");
    recommendations.push("Account is still growing — monitor for 3+ months");
  } else {
    score += 5;
    recommendations.push("Low follower count — may not be a strong lead yet");
  }

  // ── Engagement Rate (0-30 points) ─────────────────────────────
  const { engagementRate } = profile;
  if (engagementRate >= 6) {
    score += 30;
    reasons.push(`Exceptional engagement rate: ${engagementRate.toFixed(1)}%`);
  } else if (engagementRate >= 3) {
    score += 22;
    reasons.push(`Strong engagement rate: ${engagementRate.toFixed(1)}%`);
  } else if (engagementRate >= 1.5) {
    score += 14;
    reasons.push(`Average engagement rate: ${engagementRate.toFixed(1)}%`);
    recommendations.push("Engagement could be stronger — check content quality");
  } else {
    score += 5;
    recommendations.push("Low engagement — possible bot followers or low content quality");
  }

  // ── Posting Frequency (0-15 points) ───────────────────────────
  const { postFrequency } = profile;
  if (postFrequency >= 4) {
    score += 15;
    reasons.push("Highly active account (4+ posts/week)");
  } else if (postFrequency >= 2) {
    score += 10;
    reasons.push("Active account (2-4 posts/week)");
  } else if (postFrequency >= 1) {
    score += 6;
    reasons.push("Moderate posting frequency");
    recommendations.push("Encourage more consistent posting");
  } else {
    score += 2;
    recommendations.push("Infrequent posting — may not be actively managing account");
  }

  // ── Profile Completeness (0-15 points) ────────────────────────
  if (profile.hasBio) { score += 7; reasons.push("Complete bio"); }
  if (profile.hasWebsite) { score += 8; reasons.push("Has website link — monetization signal"); }

  // ── Verification & Brand Safety (0-15 points) ─────────────────
  if (profile.isVerified) {
    score += 10;
    reasons.push("Verified account — high credibility");
  }
  if (profile.brandSafetyScore !== undefined) {
    score += Math.round(profile.brandSafetyScore * 5);
    if (profile.brandSafetyScore >= 0.8) {
      reasons.push("High brand safety score");
    } else {
      recommendations.push("Review brand safety before partnering");
    }
  }

  // ── Clamp score ────────────────────────────────────────────────
  score = Math.min(100, Math.max(0, Math.round(score)));

  // ── Determine tier ─────────────────────────────────────────────
  let tier: LeadScoreResult["tier"];
  if (score >= 75) tier = "QUALIFIED";
  else if (score >= 55) tier = "HOT";
  else if (score >= 35) tier = "WARM";
  else tier = "COLD";

  return { score, tier, reasons, recommendations };
}

/**
 * Batch analyze multiple profiles
 */
export async function batchAnalyzeProfiles(
  profiles: Array<{
    username: string;
    bio: string;
    recentCaptions: string[];
    hashtags: string[];
  }>,
  concurrency = 3
): Promise<Map<string, NicheAnalysisResult>> {
  const results = new Map<string, NicheAnalysisResult>();

  // Process in batches to respect rate limits
  for (let i = 0; i < profiles.length; i += concurrency) {
    const batch = profiles.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((p) => analyzeNiche(p))
    );

    batch.forEach((profile, idx) => {
      const result = batchResults[idx];
      if (result.status === "fulfilled") {
        results.set(profile.username, result.value);
      } else {
        logger.warn("Niche analysis failed for profile", {
          username: profile.username,
          error: result.reason,
        });
      }
    });

    // Rate limit delay between batches
    if (i + concurrency < profiles.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}

/**
 * Fallback niche analysis using keyword matching
 */
function fallbackNicheAnalysis(profileData: {
  username: string;
  bio: string;
  hashtags: string[];
}): NicheAnalysisResult {
  const text = `${profileData.bio} ${profileData.hashtags.join(" ")}`.toLowerCase();

  const nicheKeywords: Record<string, string[]> = {
    "Fitness & Workout": ["fitness", "gym", "workout", "gains", "bodybuilding", "crossfit"],
    "Food & Cooking": ["food", "recipe", "cooking", "chef", "foodie", "eat"],
    "Travel & Adventure": ["travel", "adventure", "explore", "wanderlust", "trip"],
    "Fashion & Style": ["fashion", "style", "outfit", "ootd", "clothing", "wear"],
    "Technology & Gadgets": ["tech", "technology", "gadget", "coding", "developer"],
    "Beauty & Makeup": ["beauty", "makeup", "skincare", "cosmetics", "glow"],
  };

  let bestNiche = "Lifestyle";
  let bestScore = 0;

  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    const score = keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestNiche = niche;
    }
  }

  return {
    primaryNiche: bestNiche,
    subNiches: [],
    contentThemes: [],
    audienceSentiment: 0.7,
    brandSafetyScore: 0.8,
    confidence: 0.4,
  };
}

/**
 * Detect engagement anomalies (bot detection)
 */
export function detectEngagementAnomalies(profile: {
  followersCount: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
}): { isSuspicious: boolean; flags: string[] } {
  const flags: string[] = [];

  // Too high engagement for large accounts
  if (profile.followersCount > 50000 && profile.engagementRate > 15) {
    flags.push("Suspiciously high engagement rate for large account");
  }

  // Very low comments relative to likes
  const likeCommentRatio = profile.avgLikes / (profile.avgComments || 1);
  if (likeCommentRatio > 500) {
    flags.push("Abnormally high likes-to-comments ratio");
  }

  // Near-zero engagement
  if (profile.followersCount > 10000 && profile.engagementRate < 0.1) {
    flags.push("Extremely low engagement for account size — possible bought followers");
  }

  return { isSuspicious: flags.length > 0, flags };
}
