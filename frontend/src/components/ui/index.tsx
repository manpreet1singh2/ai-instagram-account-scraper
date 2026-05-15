import { motion } from "framer-motion";
import { Loader2, LucideIcon } from "lucide-react";
import React from "react";

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = "qualified" | "hot" | "warm" | "cold" | "new" | "success" | "error" | "warning" | "info";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  qualified: "bg-green-500/15 text-green-400 border-green-500/20",
  hot:       "bg-orange-500/15 text-orange-400 border-orange-500/20",
  warm:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  cold:      "bg-blue-500/15 text-blue-400 border-blue-500/20",
  new:       "bg-brand-500/15 text-brand-400 border-brand-500/20",
  success:   "bg-green-500/15 text-green-400 border-green-500/20",
  error:     "bg-red-500/15 text-red-400 border-red-500/20",
  warning:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  info:      "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "info", children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${BADGE_STYLES[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  change?: string;
  loading?: boolean;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, iconColor = "from-brand-500 to-brand-700", change, loading, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="stat-card"
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center`}>
          <Icon size={17} className="text-white" />
        </div>
        {change && (
          <span className="text-xs text-gray-500 bg-surface-hover px-2 py-0.5 rounded-full">{change}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">
          {loading ? <span className="animate-pulse text-gray-600">—</span> : value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-600" />
      </div>
      <h3 className="text-gray-300 font-semibold text-lg">{title}</h3>
      {description && <p className="text-gray-500 text-sm mt-1 max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-4">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: number;
  className?: string;
  fullPage?: boolean;
}

export function Spinner({ size = 24, className = "", fullPage = false }: SpinnerProps) {
  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={size} className={`animate-spin text-brand-400 ${className}`} />
      </div>
    );
  }
  return <Loader2 size={size} className={`animate-spin text-brand-400 ${className}`} />;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ value, max = 100, color = "bg-brand-500", showLabel = false, className = "" }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Progress</span>
          <span className="text-white font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, icon: Icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon size={16} className="text-brand-400" />
          </div>
        )}
        <div>
          <h2 className="text-white font-semibold">{title}</h2>
          {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Engagement Rate Indicator ─────────────────────────────────────────────────

export function EngagementBadge({ rate }: { rate: number }) {
  const getVariant = () => {
    if (rate >= 6) return { variant: "qualified" as BadgeVariant, label: "Exceptional" };
    if (rate >= 3) return { variant: "hot" as BadgeVariant, label: "Strong" };
    if (rate >= 1.5) return { variant: "warm" as BadgeVariant, label: "Average" };
    return { variant: "cold" as BadgeVariant, label: "Low" };
  };
  const { variant, label } = getVariant();
  return (
    <Badge variant={variant}>
      {rate.toFixed(1)}% — {label}
    </Badge>
  );
}
