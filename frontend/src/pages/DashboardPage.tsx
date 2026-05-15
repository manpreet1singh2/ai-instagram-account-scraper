import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Search, Star, TrendingUp, Zap, Target,
  ArrowUpRight, ChevronRight, Instagram
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { analyticsApi } from "../services/api";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const TIER_COLORS: Record<string, string> = {
  QUALIFIED: "#22c55e",
  HOT: "#f97316",
  WARM: "#eab308",
  COLD: "#3b82f6",
};

const STAGGER = { parent: { animate: {} }, child: (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08 } }) };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview().then((r) => r.data.data),
    refetchInterval: 30000,
  });
  const { data: trendsData } = useQuery({
    queryKey: ["analytics", "trends"],
    queryFn: () => analyticsApi.trends(14).then((r) => r.data.data.trends),
  });

  const stats = [
    { label: "Total Profiles", value: overview?.totals?.profiles ?? 0, icon: Users, color: "brand", change: "+12%" },
    { label: "Active Jobs", value: overview?.totals?.activeJobs ?? 0, icon: Search, color: "purple", change: "live" },
    { label: "Qualified Leads", value: overview?.totals?.qualifiedLeads ?? 0, icon: Star, color: "green", change: "+8%" },
    { label: "Avg Lead Score", value: overview?.averages?.leadScore ?? 0, icon: Target, color: "orange", change: "score" },
  ];

  const colorMap: Record<string, string> = {
    brand: "from-brand-500 to-brand-700",
    purple: "from-purple-500 to-purple-700",
    green: "from-green-500 to-emerald-700",
    orange: "from-orange-500 to-red-600",
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div {...STAGGER.child(0)}>
        <h1 className="text-2xl font-bold text-white">
          Good morning, <span className="gradient-text">{user?.name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Here's what's happening with your discovery pipeline</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} {...STAGGER.child(i + 1)} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorMap[stat.color]} flex items-center justify-center`}>
                <stat.icon size={17} className="text-white" />
              </div>
              <span className="text-xs text-gray-500 bg-surface-hover px-2 py-0.5 rounded-full">{stat.change}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {isLoading ? <span className="animate-pulse">—</span> : stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <motion.div {...STAGGER.child(5)} className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Discovery Trend</h2>
              <p className="text-gray-500 text-xs mt-0.5">Profiles discovered over 14 days</p>
            </div>
            <TrendingUp size={16} className="text-brand-400" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendsData || []}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f52f8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f52f8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2136" />
              <XAxis dataKey="date" stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#141626", border: "1px solid #1e2136", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#f1f5f9" }}
              />
              <Area type="monotone" dataKey="count" stroke="#4f52f8" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Lead Tier Donut */}
        <motion.div {...STAGGER.child(6)} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Lead Tiers</h2>
              <p className="text-gray-500 text-xs mt-0.5">Distribution by quality</p>
            </div>
          </div>
          {overview?.tierDistribution?.length ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={overview.tierDistribution}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    strokeWidth={0}
                  >
                    {overview.tierDistribution.map((entry: any) => (
                      <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || "#6b7280"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {overview.tierDistribution.map((item: any) => (
                  <div key={item.tier} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[item.tier] }} />
                      <span className="text-gray-400 capitalize">{item.tier.toLowerCase()}</span>
                    </div>
                    <span className="text-white font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <Zap size={24} className="text-gray-600 mb-2" />
              <p className="text-gray-500 text-xs">No data yet. Start a discovery.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Profiles + Top Niches */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent */}
        <motion.div {...STAGGER.child(7)} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Recent Profiles</h2>
            <Link to="/profiles" className="text-brand-400 text-xs hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface-hover rounded-xl animate-pulse" />
              ))
            ) : overview?.recentProfiles?.length ? (
              overview.recentProfiles.map((p: any) => (
                <Link to={`/profiles/${p.id || ""}`} key={p.username} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Instagram size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">@{p.username}</p>
                    <p className="text-gray-500 text-xs">{p.niche || "Analyzing..."}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm font-bold">{p.leadScore}</p>
                    <p className="text-gray-500 text-xs">score</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Search size={24} className="mx-auto mb-2 opacity-30" />
                No profiles yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Niches */}
        <motion.div {...STAGGER.child(8)} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Top Niches</h2>
            <Link to="/analytics" className="text-brand-400 text-xs hover:text-brand-300 flex items-center gap-1">
              Full report <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {overview?.topNiches?.length ? (
              overview.topNiches.slice(0, 6).map((n: any, i: number) => {
                const max = overview.topNiches[0]?.count || 1;
                const pct = Math.round((n.count / max) * 100);
                return (
                  <div key={n.niche} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300">{n.niche}</span>
                      <span className="text-gray-500">{n.count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <BarChart3 size={24} className="mx-auto mb-2 opacity-30" />
                No niche data yet
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BarChart3({ size, className }: { size: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="12" width="4" height="9" /><rect x="10" y="6" width="4" height="15" /><rect x="17" y="3" width="4" height="18" /></svg>;
}
