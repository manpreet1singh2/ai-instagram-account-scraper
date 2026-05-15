import axios, { AxiosInstance } from "axios";
import { logger } from "../config/logger";
import { cache } from "../config/redis";

export interface InstagramProfile {
  instagramId: string;
  username: string;
  fullName: string;
  bio: string;
  website: string;
  profilePicUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  recentPosts: InstagramPost[];
}

export interface InstagramPost {
  instagramPostId: string;
  type: "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL";
  caption: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  postedAt: string;
}

export interface SearchResult {
  profiles: Partial<InstagramProfile>[];
  hasMore: boolean;
  nextCursor?: string;
}

// Multiple data source adapters
class RapidAPIAdapter {
  private client: AxiosInstance;
  private readonly baseUrl = "https://instagram-scraper-api2.p.rapidapi.com";

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "",
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST || "instagram-scraper-api2.p.rapidapi.com",
      },
      timeout: 15000,
    });
  }

  async searchByHashtag(hashtag: string, cursor?: string): Promise<SearchResult> {
    const cacheKey = `hashtag:${hashtag}:${cursor || "start"}`;
    const cached = await cache.get<SearchResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get("/v1/hashtag", {
        params: { hashtag: hashtag.replace("#", ""), cursor },
      });

      const data = response.data;
      const result: SearchResult = {
        profiles: this.parseHashtagResults(data),
        hasMore: !!data.data?.next_cursor,
        nextCursor: data.data?.next_cursor,
      };

      await cache.set(cacheKey, result, 3600); // Cache 1 hour
      return result;
    } catch (error: any) {
      logger.error("RapidAPI hashtag search failed", { hashtag, error: error.message });
      return { profiles: [], hasMore: false };
    }
  }

  async getProfile(username: string): Promise<InstagramProfile | null> {
    const cacheKey = `profile:${username}`;
    const cached = await cache.get<InstagramProfile>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get("/v1.2/info", {
        params: { username_or_id_or_url: username },
      });

      const data = response.data?.data;
      if (!data) return null;

      const profile = this.parseProfileData(data);

      // Fetch recent posts
      profile.recentPosts = await this.getRecentPosts(username);

      await cache.set(cacheKey, profile, 7200); // Cache 2 hours
      return profile;
    } catch (error: any) {
      logger.error("Failed to fetch profile", { username, error: error.message });
      return null;
    }
  }

  async getRecentPosts(username: string): Promise<InstagramPost[]> {
    try {
      const response = await this.client.get("/v1.2/posts", {
        params: { username_or_id_or_url: username },
      });

      const items = response.data?.data?.items || [];
      return items.slice(0, 12).map(this.parsePostData);
    } catch {
      return [];
    }
  }

  private parseProfileData(data: any): InstagramProfile {
    return {
      instagramId: String(data.id || data.pk || ""),
      username: data.username || "",
      fullName: data.full_name || "",
      bio: data.biography || "",
      website: data.external_url || "",
      profilePicUrl: data.profile_pic_url_hd || data.profile_pic_url || "",
      followersCount: Number(data.follower_count || data.edge_followed_by?.count || 0),
      followingCount: Number(data.following_count || data.edge_follow?.count || 0),
      postsCount: Number(data.media_count || data.edge_owner_to_timeline_media?.count || 0),
      isVerified: Boolean(data.is_verified),
      isPrivate: Boolean(data.is_private),
      recentPosts: [],
    };
  }

  private parsePostData(item: any): InstagramPost {
    const caption = item.caption?.text || item.edge_media_to_caption?.edges?.[0]?.node?.text || "";
    const hashtags = (caption.match(/#\w+/g) || []).map((h: string) => h.toLowerCase());

    return {
      instagramPostId: String(item.id || item.pk || ""),
      type: item.media_type === 2 ? "VIDEO" : item.product_type === "carousel_container" ? "CAROUSEL" : "IMAGE",
      caption,
      hashtags,
      likesCount: Number(item.like_count || item.edge_liked_by?.count || 0),
      commentsCount: Number(item.comment_count || item.edge_media_to_comment?.count || 0),
      viewsCount: item.view_count || item.video_view_count || undefined,
      postedAt: item.taken_at
        ? new Date(item.taken_at * 1000).toISOString()
        : new Date().toISOString(),
    };
  }

  private parseHashtagResults(data: any): Partial<InstagramProfile>[] {
    const items = data?.data?.items || data?.items || [];
    return items
      .filter((item: any) => item?.user)
      .map((item: any) => ({
        username: item.user?.username,
        fullName: item.user?.full_name,
        profilePicUrl: item.user?.profile_pic_url,
        followersCount: item.user?.follower_count,
        isVerified: item.user?.is_verified,
      }))
      .filter((p: any) => p.username);
  }
}

// Rate-limited request manager
class RateLimitedFetcher {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly rpm: number;
  private requests: number[] = [];

  constructor(requestsPerMinute = 30) {
    this.rpm = requestsPerMinute;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      await this.waitForRateLimit();
      const fn = this.queue.shift();
      if (fn) {
        this.requests.push(Date.now());
        await fn();
      }
    }

    this.processing = false;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    const windowStart = now - 60000;
    this.requests = this.requests.filter((t) => t > windowStart);

    if (this.requests.length >= this.rpm) {
      const oldest = this.requests[0];
      const waitTime = 60000 - (now - oldest) + 100;
      logger.debug(`Rate limit: waiting ${waitTime}ms`);
      await new Promise((r) => setTimeout(r, waitTime));
    } else {
      // Minimum delay between requests
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));
    }
  }
}

// Singleton instances
const rapidAPI = new RapidAPIAdapter();
const rateLimiter = new RateLimitedFetcher(
  parseInt(process.env.DISCOVERY_RATE_LIMIT_RPM || "30")
);

/**
 * Main Instagram service - public API
 */
export const instagramService = {
  async searchByHashtag(hashtag: string, cursor?: string): Promise<SearchResult> {
    return rateLimiter.add(() => rapidAPI.searchByHashtag(hashtag, cursor));
  },

  async getProfile(username: string): Promise<InstagramProfile | null> {
    return rateLimiter.add(() => rapidAPI.getProfile(username));
  },

  calculateEngagementRate(profile: InstagramProfile): number {
    if (!profile.recentPosts.length || !profile.followersCount) return 0;

    const totalInteractions = profile.recentPosts.reduce(
      (sum, post) => sum + post.likesCount + post.commentsCount,
      0
    );

    const avgInteractions = totalInteractions / profile.recentPosts.length;
    return (avgInteractions / profile.followersCount) * 100;
  },

  calculatePostFrequency(posts: InstagramPost[]): number {
    if (posts.length < 2) return 0;

    const sorted = posts
      .map((p) => new Date(p.postedAt).getTime())
      .sort((a, b) => b - a);

    const totalDays =
      (sorted[0] - sorted[sorted.length - 1]) / (1000 * 60 * 60 * 24);
    if (totalDays === 0) return 0;

    return (posts.length / totalDays) * 7; // posts per week
  },

  extractHashtags(posts: InstagramPost[]): string[] {
    const hashtagCount = new Map<string, number>();
    posts.forEach((post) => {
      post.hashtags.forEach((tag) => {
        hashtagCount.set(tag, (hashtagCount.get(tag) || 0) + 1);
      });
    });

    return Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag]) => tag);
  },

  meetsFollowerCriteria(
    followersCount: number,
    min: number,
    max: number
  ): boolean {
    return followersCount >= min && followersCount <= max;
  },
};
