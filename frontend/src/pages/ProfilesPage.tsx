import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Filter, SlidersHorizontal, Instagram, Star,
  ExternalLink, Zap, ChevronLeft, ChevronRight, Loader2, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { profileApi, leadApi } from "../services/api";
import toast from "react-hot-toast";

const TIER_CONFIG = {
  QUALIFIED: { label: "Qualified", className: "badge-qualified" },
  HOT:       { label: "Hot",       className: "badge-hot" },
  WARM:      { label: "Warm",      className: "badge-warm" },
  COLD:      { label: "Cold",      className: "badge-cold" },
};

export default function ProfilesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ sortBy: "leadScore", tier: "", niche: "" });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profiles", page, filters],
    queryFn: () => profileApi.list({ page, limit: 30, ...filters }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });

  const saveLead = useMutation({
    mutationFn: (profileId: string) => leadApi.create({ profileId }),
    onSuccess: () => toast.success("✅ Saved to leads"),
    onError: () => toast.error("Already in leads"),
  });

  const profiles = data?.profiles || [];
  const totalPages = data?.pages || 1;

  const filtered = profiles.filter((p: any) =>
    !search || p.username.toLowerCase().includes(search.toLowerCase()) ||
    (p.fullName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discovered Profiles</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.total?.toLocaleString() || 0} profiles total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-9"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={filters.tier}
            onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}
          >
            <option value="">All Tiers</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="HOT">Hot</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
          </select>
          <select
            className="input w-auto"
            value={filters.sortBy}
            onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
          >
            <option value="leadScore">Sort by Score</option>
            <option value="followersCount">Sort by Followers</option>
            <option value="engagementRate">Sort by Engagement</option>
            <option value="createdAt">Sort by Date</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 size={28} className="animate-spin text-brand-400 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No profiles found</p>
            <p className="text-gray-600 text-sm mt-1">Start a discovery to find Instagram accounts</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {["Profile", "Followers", "Engagement", "Posts/wk", "Niche", "Lead Score", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map((profile: any) => {
                  const tier = TIER_CONFIG[profile.leadTier as keyof typeof TIER_CONFIG];
                  return (
                    <motion.tr
                      key={profile.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface-hover/50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Instagram size={15} className="text-white" />
                          </div>
                          <div>
                            <Link to={`/profiles/${profile.id}`} className="text-white font-medium hover:text-brand-400 transition-colors">
                              @{profile.username}
                            </Link>
                            <p className="text-gray-500 text-xs truncate max-w-28">{profile.fullName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{profile.followersCount?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${profile.engagementRate >= 3 ? "text-green-400" : profile.engagementRate >= 1 ? "text-yellow-400" : "text-gray-400"}`}>
                          {profile.engagementRate?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{profile.postFrequency?.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        {profile.niche ? (
                          <span className="text-xs text-gray-300 bg-surface-border px-2 py-0.5 rounded-lg">{profile.niche}</span>
                        ) : (
                          <span className="text-gray-600 text-xs">Analyzing…</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-bold text-base">{profile.leadScore}</div>
                          {tier && <span className={tier.className}>{tier.label}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => saveLead.mutate(profile.id)}
                            title="Save as lead"
                            className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                          >
                            <Star size={14} />
                          </button>
                          <a
                            href={`https://instagram.com/${profile.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <Link
                            to={`/profiles/${profile.id}`}
                            className="p-1.5 text-gray-500 hover:text-white hover:bg-surface-border rounded-lg transition-colors"
                          >
                            <Zap size={14} />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-border flex items-center justify-between">
            <p className="text-gray-500 text-xs">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost p-1.5 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost p-1.5 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
