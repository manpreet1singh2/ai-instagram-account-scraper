import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, PieChart as PieIcon, Zap, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from "recharts";
import { analyticsApi } from "../services/api";

const COLORS = ["#4f52f8", "#a855f7", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#f43f5e"];

export default function AnalyticsPage() {
  const { data: overview } = useQuery({ queryKey: ["analytics", "overview"], queryFn: () => analyticsApi.overview().then((r) => r.data.data) });
  const { data: trends, isLoading: trendsLoading } = useQuery({ queryKey: ["analytics", "trends", 30], queryFn: () => analyticsApi.trends(30).then((r) => r.data.data.trends) });
  const { data: niches, isLoading: nichesLoading } = useQuery({ queryKey: ["analytics", "niches"], queryFn: () => analyticsApi.niches().then((r) => r.data.data) });

  const topNiches = (niches || []).slice(0, 8);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Deep insights into your discovery pipeline</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Engagement Rate", value: `${overview?.averages?.engagementRate || 0}%`, color: "text-green-400" },
          { label: "Avg Lead Score", value: overview?.averages?.leadScore || 0, color: "text-brand-400" },
          { label: "Avg Followers", value: (overview?.averages?.followers || 0).toLocaleString(), color: "text-purple-400" },
          { label: "Total Profiles", value: (overview?.totals?.profiles || 0).toLocaleString(), color: "text-orange-400" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-gray-500 text-xs">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Trends */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-brand-400" />
          <h2 className="text-white font-semibold text-sm">30-Day Discovery Trend</h2>
        </div>
        {trendsLoading ? (
          <div className="h-56 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-brand-400" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends || []}>
              <defs>
                <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f52f8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f52f8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2136" />
              <XAxis dataKey="date" stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#141626", border: "1px solid #1e2136", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#9ca3af" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Area type="monotone" dataKey="count" name="Profiles Found" stroke="#4f52f8" fill="url(#gradCount)" strokeWidth={2} />
              <Area type="monotone" dataKey="avg_score" name="Avg Lead Score" stroke="#a855f7" fill="url(#gradScore)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Niche Breakdown + Tier Chart */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Niche Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3Icon size={16} className="text-brand-400" />
            <h2 className="text-white font-semibold text-sm">Top Niches</h2>
          </div>
          {nichesLoading ? (
            <div className="h-52 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-brand-400" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topNiches} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2136" horizontal={false} />
                <XAxis type="number" stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis type="category" dataKey="niche" width={120} stroke="#374151" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#141626", border: "1px solid #1e2136", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#9ca3af" }} />
                <Bar dataKey="count" name="Profiles" radius={[0, 4, 4, 0]}>
                  {topNiches.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Lead Tier Pie */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon size={16} className="text-brand-400" />
            <h2 className="text-white font-semibold text-sm">Lead Tier Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={overview?.tierDistribution || []}
                dataKey="count"
                nameKey="tier"
                cx="50%"
                cy="50%"
                outerRadius={80}
                strokeWidth={0}
                label={({ tier, percent }) => `${tier} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: "#374151" }}
              >
                {(overview?.tierDistribution || []).map((_: any, i: number) => (
                  <Cell key={i} fill={["#22c55e", "#f97316", "#eab308", "#3b82f6"][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#141626", border: "1px solid #1e2136", borderRadius: 10, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Niche Performance Table */}
      {topNiches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center gap-2">
            <Zap size={15} className="text-brand-400" />
            <h2 className="text-white font-semibold text-sm">Niche Performance Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {["#", "Niche", "Profiles", "Avg Lead Score", "Avg Engagement", "Avg Followers"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {topNiches.map((n: any, i: number) => (
                  <tr key={n.niche} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-white font-medium">{n.niche}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{n.count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-surface-border rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${n.avgLeadScore}%` }} />
                        </div>
                        <span className="text-gray-300">{n.avgLeadScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={n.avgEngagement >= 3 ? "text-green-400" : n.avgEngagement >= 1 ? "text-yellow-400" : "text-gray-400"}>
                        {n.avgEngagement}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{n.avgFollowers?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function BarChart3Icon({ size, className }: { size: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="12" width="4" height="9" /><rect x="10" y="6" width="4" height="15" /><rect x="17" y="3" width="4" height="18" /></svg>;
}
