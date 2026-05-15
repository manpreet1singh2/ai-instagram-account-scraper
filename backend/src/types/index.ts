// ─── API Request/Response Types ──────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// ─── Discovery Types ──────────────────────────────────────────────────────────

export interface DiscoverySearchParams {
  keywords?: string[];
  hashtags?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  niches?: string[];
  languages?: string[];
  locations?: string[];
}

export interface DiscoveryJobProgress {
  jobId: string;
  status: JobStatus;
  processed: number;
  totalFound: number;
  failed: number;
  progress: number; // 0-100
}

// ─── Profile Types ────────────────────────────────────────────────────────────

export interface ProfileMetrics {
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  postFrequency: number;
}

export interface ProfileFilters {
  page?: number;
  limit?: number;
  sortBy?: "leadScore" | "followersCount" | "engagementRate" | "createdAt";
  order?: "asc" | "desc";
  tier?: LeadTier;
  niche?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minScore?: number;
  jobId?: string;
}

// ─── AI Types ────────────────────────────────────────────────────────────────

export interface NicheDetectionInput {
  username: string;
  bio: string;
  recentCaptions: string[];
  hashtags: string[];
}

export interface NicheDetectionOutput {
  primaryNiche: string;
  subNiches: string[];
  contentThemes: string[];
  audienceSentiment: number;
  brandSafetyScore: number;
  confidence: number;
}

export interface LeadScoreInput {
  followersCount: number;
  engagementRate: number;
  postFrequency: number;
  isVerified: boolean;
  hasBio: boolean;
  hasWebsite: boolean;
  niche?: string;
  audienceSentiment?: number;
  brandSafetyScore?: number;
}

export interface LeadScoreOutput {
  score: number;
  tier: LeadTier;
  reasons: string[];
  recommendations: string[];
}

// ─── Enum Types ───────────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "USER" | "VIEWER";
export type PlanType = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type LeadTier = "COLD" | "WARM" | "HOT" | "QUALIFIED";
export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "DISQUALIFIED" | "CONVERTED";
export type PostType = "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL" | "STORY";
export type ExportFormat = "CSV" | "EXCEL" | "JSON";

// ─── Export Types ─────────────────────────────────────────────────────────────

export interface ExportOptions {
  format: ExportFormat;
  filters?: {
    jobId?: string;
    minScore?: number;
    niche?: string;
    tier?: LeadTier;
    minFollowers?: number;
    maxFollowers?: number;
  };
}

// ─── Webhook Types ────────────────────────────────────────────────────────────

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Extend Express Request ───────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
