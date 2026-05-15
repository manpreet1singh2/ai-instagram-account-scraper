import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Play, Clock, CheckCircle,
  XCircle, Loader2, Hash, Users, Zap, Filter
} from "lucide-react";
import toast from "react-hot-toast";
import { discoveryApi } from "../services/api";
import { format } from "date-fns";

interface DiscoveryParams {
  keywords: string[];
  hashtags: string[];
  minFollowers: number;
  maxFollowers: number;
  minEngagement: number;
  niches: string[];
}

const STATUS_CONFIG = {
  PENDING:   { icon: Clock,        color: "text-yellow-400", bg: "bg-yellow-400/10" },
  RUNNING:   { icon: Loader2,      color: "text-brand-400",  bg: "bg-brand-400/10",  spin: true },
  COMPLETED: { icon: CheckCircle,  color: "text-green-400",  bg: "bg-green-400/10" },
  FAILED:    { icon: XCircle,      color: "text-red-400",    bg: "bg-red-400/10" },
  CANCELLED: { icon: XCircle,      color: "text-gray-400",   bg: "bg-gray-400/10" },
};

const NICHE_OPTIONS = [
  "Fashion & Style", "Beauty & Makeup", "Fitness & Workout", "Food & Cooking",
  "Travel & Adventure", "Technology & Gadgets", "Business & Entrepreneurship",
  "Health & Wellness", "Gaming", "Education & Learning", "Music", "Art & Design",
];

export default function DiscoveryPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tagInput, setTagInput] = useState({ keywords: "", hashtags: "" });
  const [params, setParams] = useState<DiscoveryParams>({
    keywords: [], hashtags: [], minFollowers: 5000,
    maxFollowers: 100000, minEngagement: 1, niches: [],
  });

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["discovery", "jobs"],
    queryFn: () => discoveryApi.getJobs().then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: () => discoveryApi.start(params),
    onSuccess: () => {
      toast.success("🚀 Discovery job started!");
      qc.invalidateQueries({ queryKey: ["discovery", "jobs"] });
      setShowForm(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to start discovery"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => discoveryApi.cancelJob(id),
    onSuccess: () => {
      toast.success("Job cancelled");
      qc.invalidateQueries({ queryKey: ["discovery", "jobs"] });
    },
  });

  const resetForm = () => {
    setParams({ keywords: [], hashtags: [], minFollowers: 5000, maxFollowers: 100000, minEngagement: 1, niches: [] });
    setTagInput({ keywords: "", hashtags: "" });
  };

  const addTag = (field: "keywords" | "hashtags", value: string) => {
    const cleaned = value.trim().replace(/^#/, "");
    if (cleaned && !params[field].includes(cleaned)) {
      setParams((p) => ({ ...p, [field]: [...p[field], cleaned] }));
    }
    setTagInput((t) => ({ ...t, [field]: "" }));
  };

  const removeTag = (field: "keywords" | "hashtags", tag: string) => {
    setParams((p) => ({ ...p, [field]: p[field].filter((t) => t !== tag) }));
  };

  const toggleNiche = (niche: string) => {
    setParams((p) => ({
      ...p,
      niches: p.niches.includes(niche) ? p.niches.filter((n) => n !== niche) : [...p.niches, niche],
    }));
  };

  const jobs = jobsData?.jobs || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discovery Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Find Instagram accounts by hashtag, keyword, and niche</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          <Plus size={16} /> New Discovery
        </motion.button>
      </div>

      {/* New Discovery Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-6 space-y-5 border-brand-500/20"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2"><Zap size={16} className="text-brand-400" /> Configure Discovery</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            {/* Keywords */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Keywords</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {params.keywords.map((k) => (
                  <span key={k} className="badge bg-brand-500/15 text-brand-300 border border-brand-500/20">
                    {k} <button onClick={() => removeTag("keywords", k)}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="e.g. fitness coach, food blogger"
                  value={tagInput.keywords}
                  onChange={(e) => setTagInput((t) => ({ ...t, keywords: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addTag("keywords", tagInput.keywords)}
                />
                <button className="btn-secondary px-3" onClick={() => addTag("keywords", tagInput.keywords)}>Add</button>
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block flex items-center gap-1"><Hash size={11} /> Hashtags</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {params.hashtags.map((h) => (
                  <span key={h} className="badge bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    #{h} <button onClick={() => removeTag("hashtags", h)}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="e.g. fitness, foodie, travel"
                  value={tagInput.hashtags}
                  onChange={(e) => setTagInput((t) => ({ ...t, hashtags: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addTag("hashtags", tagInput.hashtags)}
                />
                <button className="btn-secondary px-3" onClick={() => addTag("hashtags", tagInput.hashtags)}>Add</button>
              </div>
            </div>

            {/* Follower Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block flex items-center gap-1"><Users size={11} /> Min Followers</label>
                <input type="number" className="input" value={params.minFollowers}
                  onChange={(e) => setParams((p) => ({ ...p, minFollowers: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Max Followers</label>
                <input type="number" className="input" value={params.maxFollowers}
                  onChange={(e) => setParams((p) => ({ ...p, maxFollowers: Number(e.target.value) }))} />
              </div>
            </div>

            {/* Min Engagement */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Min Engagement Rate (%)</label>
              <input type="number" step="0.1" className="input" value={params.minEngagement}
                onChange={(e) => setParams((p) => ({ ...p, minEngagement: Number(e.target.value) }))} />
            </div>

            {/* Niches */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block flex items-center gap-1"><Filter size={11} /> Target Niches</label>
              <div className="flex flex-wrap gap-2">
                {NICHE_OPTIONS.map((niche) => (
                  <button
                    key={niche}
                    onClick={() => toggleNiche(niche)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      params.niches.includes(niche)
                        ? "bg-brand-500/20 border-brand-500/40 text-brand-300"
                        : "bg-surface-hover border-surface-border text-gray-400 hover:text-white"
                    }`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending || (!params.keywords.length && !params.hashtags.length)}
                className="btn-primary flex-1 justify-center"
              >
                {startMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Starting...</> : <><Play size={15} /> Start Discovery</>}
              </motion.button>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jobs List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Discovery Jobs</h2>
          <span className="text-gray-500 text-xs">{jobs.length} jobs</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-brand-400 mx-auto" /></div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <Search size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No discovery jobs yet</p>
            <p className="text-gray-600 text-sm mt-1">Start your first discovery to find Instagram accounts</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {jobs.map((job: any) => {
              const status = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG];
              const progress = job.totalFound > 0 ? Math.round((job.processed / job.totalFound) * 100) : 0;
              return (
                <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 hover:bg-surface-hover/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg ${status.bg} flex items-center justify-center flex-shrink-0`}>
                      <status.icon size={15} className={`${status.color} ${(status as any).spin ? "animate-spin" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.hashtags?.map((h: string) => (
                          <span key={h} className="text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">#{h}</span>
                        ))}
                        {job.keywords?.map((k: string) => (
                          <span key={k} className="text-xs text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded">{k}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                        <span>{job._count?.profiles || 0} profiles found</span>
                        <span>{format(new Date(job.createdAt), "MMM d, h:mm a")}</span>
                        <span>{job.minFollowers?.toLocaleString()}–{job.maxFollowers?.toLocaleString()} followers</span>
                      </div>
                      {job.status === "RUNNING" && (
                        <div className="mt-2 h-1 bg-surface-border rounded-full overflow-hidden w-48">
                          <motion.div className="h-full bg-brand-500 rounded-full" animate={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    {(job.status === "PENDING" || job.status === "RUNNING") && (
                      <button
                        onClick={() => cancelMutation.mutate(job.id)}
                        className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
