// ── API Response Types ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedData<T> {
  items?: T[];
  profiles?: T[];
  leads?: T[];
  jobs?: T[];
  total: number;
  page: number;
  pages: number;
}

// ── User Types ────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: PlanType;
  monthlyQuota: number;
  usedQuota: number;
  createdAt: string;
  lastLoginAt?: string;
}

export type UserRole  = "ADMIN" | "USER" | "VIEWER";
export type PlanType  = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

// ── Profile Types ─────────────────────────────────────────────
export interface Profile {
  id: string;
  instagramId: string;
  username: string;
  fullName?: string;
  bio?: string;
  website?: string;
  profilePicUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  postFrequency: number;
  niche?: string;
  subNiches: string[];
  contentThemes: string[];
  audienceSentiment?: number;
  brandSafetyScore?: number;
  leadScore: number;
  leadTier: LeadTier;
  isVerified: boolean;
  isPrivate: boolean;
  language?: string;
  location?: string;
  dataFetchedAt: string;
  lastAnalyzedAt?: string;
  createdAt: string;
  posts?: Post[];
}

export interface Post {
  id: string;
  instagramPostId: string;
  type: PostType;
  caption?: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  postedAt?: string;
}

// ── Discovery Types ───────────────────────────────────────────
export interface DiscoveryJob {
  id: string;
  status: JobStatus;
  keywords: string[];
  hashtags: string[];
  minFollowers: number;
  maxFollowers: number;
  minEngagement: number;
  niches: string[];
  totalFound: number;
  processed: number;
  failed: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  errorMessage?: string;
  _count?: { profiles: number };
}

export interface DiscoveryParams {
  keywords?: string[];
  hashtags?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  niches?: string[];
  languages?: string[];
  locations?: string[];
}

// ── Lead Types ────────────────────────────────────────────────
export interface Lead {
  id: string;
  profileId: string;
  status: LeadStatus;
  score: number;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  profile?: Profile;
}

// ── Export Types ──────────────────────────────────────────────
export interface ExportJob {
  id: string;
  format: ExportFormat;
  status: JobStatus;
  fileUrl?: string;
  fileSize?: number;
  recordCount: number;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

// ── Analytics Types ───────────────────────────────────────────
export interface AnalyticsOverview {
  totals: {
    profiles: number;
    leads: number;
    qualifiedLeads: number;
    activeJobs: number;
  };
  quota?: { used: number; total: number; percentage: number };
  averages: {
    engagementRate: string;
    leadScore: number;
    followers: number;
  };
  tierDistribution: Array<{ tier: LeadTier; count: number }>;
  topNiches: Array<{ niche: string; count: number }>;
  recentProfiles: Partial<Profile>[];
}

export interface TrendData {
  date: string;
  count: number;
  avg_score: number;
  avg_engagement: number;
}

export interface NicheData {
  niche: string;
  count: number;
  avgLeadScore: number;
  avgEngagement: number;
  avgFollowers: number;
}

// ── Enum Types ────────────────────────────────────────────────
export type JobStatus    = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type LeadTier     = "COLD" | "WARM" | "HOT" | "QUALIFIED";
export type LeadStatus   = "NEW" | "CONTACTED" | "QUALIFIED" | "DISQUALIFIED" | "CONVERTED";
export type PostType     = "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL" | "STORY";
export type ExportFormat = "CSV" | "EXCEL" | "JSON";
