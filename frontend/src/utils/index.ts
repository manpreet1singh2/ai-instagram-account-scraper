import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// ── className merge ──────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Number formatting ────────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

// ── Date formatting ───────────────────────────────────────────
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// ── Lead score helpers ────────────────────────────────────────
export function getLeadTierColor(tier: string): string {
  const map: Record<string, string> = {
    QUALIFIED: "text-green-400",
    HOT:       "text-orange-400",
    WARM:      "text-yellow-400",
    COLD:      "text-blue-400",
  };
  return map[tier] || "text-gray-400";
}

export function getLeadTierBadgeClass(tier: string): string {
  const map: Record<string, string> = {
    QUALIFIED: "badge-qualified",
    HOT:       "badge-hot",
    WARM:      "badge-warm",
    COLD:      "badge-cold",
  };
  return map[tier] || "badge";
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-400";
  if (score >= 55) return "text-orange-400";
  if (score >= 35) return "text-yellow-400";
  return "text-blue-400";
}

export function getEngagementLabel(rate: number): { label: string; color: string } {
  if (rate >= 6)   return { label: "Exceptional", color: "text-green-400" };
  if (rate >= 3)   return { label: "Strong",      color: "text-brand-400" };
  if (rate >= 1.5) return { label: "Average",     color: "text-yellow-400" };
  return           { label: "Low",           color: "text-gray-400" };
}

// ── Instagram helpers ─────────────────────────────────────────
export function instagramUrl(username: string): string {
  return `https://www.instagram.com/${username}/`;
}

export function extractHashtags(text: string): string[] {
  return (text.match(/#\w+/g) || []).map((h) => h.toLowerCase());
}

// ── String helpers ────────────────────────────────────────────
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── URL helpers ───────────────────────────────────────────────
export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null
  );
  return filtered.length
    ? "?" + new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString()
    : "";
}

// ── Storage helpers ───────────────────────────────────────────
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
};

// ── Debounce ──────────────────────────────────────────────────
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
