import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Star, Instagram, ExternalLink, ChevronDown, Loader2,
  Filter, Search, SlidersHorizontal, CheckCircle, XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { leadApi } from "../services/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"];
const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  CONTACTED: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  QUALIFIED: "bg-green-500/15 text-green-300 border-green-500/20",
  DISQUALIFIED: "bg-red-500/15 text-red-300 border-red-500/20",
  CONVERTED: "bg-purple-500/15 text-purple-300 border-purple-500/20",
};
const TIER_COLORS: Record<string, string> = {
  QUALIFIED: "text-green-400", HOT: "text-orange-400", WARM: "text-yellow-400", COLD: "text-blue-400",
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", statusFilter],
    queryFn: () => leadApi.list({ status: statusFilter || undefined, limit: 100 }).then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => leadApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
    },
  });

  const leads = (data?.leads || []).filter((l: any) =>
    !search ||
    l.profile?.username?.toLowerCase().includes(search.toLowerCase()) ||
    l.profile?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by status
  const grouped = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = leads.filter((l: any) => l.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.total || 0} leads in pipeline</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-9" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-400" /></div>
      ) : (
        <>
          {/* Kanban Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {STATUS_OPTIONS.map((status) => (
              <div key={status} className={`card p-3 border ${STATUS_COLORS[status].split(" ").find((c) => c.startsWith("border-")) || "border-surface-border"}`}>
                <p className={`text-lg font-bold ${STATUS_COLORS[status].split(" ").find((c) => c.startsWith("text-")) || "text-white"}`}>
                  {grouped[status]?.length || 0}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{status.charAt(0) + status.slice(1).toLowerCase()}</p>
              </div>
            ))}
          </div>

          {/* Lead Cards */}
          {leads.length === 0 ? (
            <div className="card p-12 text-center">
              <Star size={36} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No leads yet</p>
              <p className="text-gray-600 text-sm mt-1">Save profiles from the discovery results to add leads</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {["Profile", "Niche", "Followers", "Score", "Status", "Tags", "Actions"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {leads.map((lead: any) => (
                      <motion.tr key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-surface-hover/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <Instagram size={13} className="text-white" />
                            </div>
                            <div>
                              <Link to={`/profiles/${lead.profileId}`} className="text-white text-sm font-medium hover:text-brand-400">
                                @{lead.profile?.username}
                              </Link>
                              <p className={`text-xs font-medium ${TIER_COLORS[lead.profile?.leadTier] || "text-gray-400"}`}>
                                {lead.profile?.leadTier}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-300 bg-surface-border px-2 py-0.5 rounded">{lead.profile?.niche || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{lead.profile?.followersCount?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-white font-bold">{lead.score || lead.profile?.leadScore}</td>
                        <td className="px-4 py-3">
                          <select
                            value={lead.status}
                            onChange={(e) => updateMutation.mutate({ id: lead.id, data: { status: e.target.value } })}
                            className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer bg-surface-card outline-none ${STATUS_COLORS[lead.status]}`}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {lead.tags?.map((tag: string) => (
                              <span key={tag} className="text-xs bg-surface-hover border border-surface-border text-gray-400 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={`https://instagram.com/${lead.profile?.username}`} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors">
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
