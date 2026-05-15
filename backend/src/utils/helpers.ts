// ─── Response Helper ──────────────────────────────────────────────────────────

export const success = (data: any, message?: string, statusCode = 200) => ({
  success: true,
  ...(message && { message }),
  data,
  timestamp: new Date().toISOString(),
});

export const paginate = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

// ─── Number Formatters ────────────────────────────────────────────────────────

export const formatFollowers = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
};

export const formatEngagement = (rate: number): string => {
  return `${rate.toFixed(2)}%`;
};

// ─── String Helpers ───────────────────────────────────────────────────────────

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
};

export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isExpired = (date: Date): boolean => {
  return new Date() > date;
};

// ─── Instagram Helpers ────────────────────────────────────────────────────────

export const buildInstagramUrl = (username: string): string =>
  `https://www.instagram.com/${username}/`;

export const extractUsernameFromUrl = (url: string): string | null => {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  return match ? match[1] : null;
};

export const normalizeHashtag = (tag: string): string => {
  return tag.replace(/^#/, "").toLowerCase().trim();
};

// ─── Async Helpers ────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

// ─── Validation ───────────────────────────────────────────────────────────────

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidInstagramUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9._]{1,30}$/.test(username);
};

export const sanitizeSearchInput = (input: string): string => {
  return input.replace(/[<>{}[\]\\]/g, "").trim().substring(0, 100);
};
