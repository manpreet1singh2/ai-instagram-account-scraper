import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Instagram, ExternalLink, Zap, Shield,
  Heart, MessageCircle, TrendingUp, Calendar, Globe,
  Star, Loader2, CheckCircle, AlertTriangle
} from "lucide-react";
import { profileApi, leadApi } from "../services/api";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts";
import toast from "react-hot-toast";
import { format } from "date-fns";

const TIER_COLORS: Record<string, string> = {
  QUALIFIED: "text-green-400 bg-green-400/10 border-green-400/20",
  HOT: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  WARM: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  COLD: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => profileApi.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => profileApi.analyze(id!),
    onSuccess: () => {
      toast.success("AI analysis queued. Results in ~30 seconds.");
      setTimeout(() => refetch(), 35000);
    },
    onError: () => toast.error("Analysis failed"),
  });

  const saveLeadMutation = useMutation({
    mutationFn: () => leadApi.create({ profileId: id }),
    onSuccess: () => toast.success("✅ Saved to leads pipeline"),
    onError: () => toast.error("Already in leads"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-brand-400" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Profile not found</p>
        <Link to="/profiles" className="text-brand-400 text-sm mt-2 hover:underline block">
          Back to profiles
        </Link>
      </div>
    );
  }

  const p = profileData;
  const tierClass = TIER_COLORS[p.leadTier] || TIER_COLORS.COLD;

  const radarData = [
    { subject: "Engagement", value: Math.min(100, (p.engagementRate / 10) * 100) },
    { subject: "Followers", value: Math.min(100, (p.followersCount / 100000) * 100) },
    { subject: "Activity", value: Math.min(100, (p.postFrequency / 7) * 100) },
    { subject: "Brand Safety", value: (p.brandSafetyScore || 0) * 100 },
    { subject: "Sentiment", value: (p.audienceSentiment || 0) * 100 },
    { subject: "Profile", value: p.website && p.bio ? 100 : p.bio ? 60 : 30 },
  ];

  const postChartData = (p.posts || []).slice(0, 10).map((post: any, i: number) => ({
    name: `Post ${i + 1}`,
    likes: post.likesCount,
    comments: post.commentsCount,
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back */}
      <Link to="/profiles" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={15} /> Back to Profiles
      </Link>

      {/* Profile Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {p.profilePicUrl ? (
              <img
                src={p.profilePicUrl}
                alt={p.username}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-surface-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Instagram size={32} className="text-white" />
              </div>
            )}
            {p.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle size={13} className="text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white">@{p.username}</h1>
                {p.fullName && <p className="text-gray-400 text-sm">{p.fullName}</p>}
              </div>
              <span className={`badge border ${tierClass} text-sm px-3 py-1`}>
                {p.leadTier}
              </span>
            </div>

            {p.bio && <p className="text-gray-300 text-sm mt-2 leading-relaxed max-w-xl">{p.bio}</p>}

            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline flex items-center gap-1">
                  <Globe size={13} /> {p.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {p.lastAnalyzedAt && (
                <span className="text-gray-500 flex items-center gap-1">
                  <Zap size={13} /> Analyzed {format(new Date(p.lastAnalyzedAt), "MMM d")}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex sm:flex-col gap-2 flex-shrink-0">
            <a
              href={`https://instagram.com/${p.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              <ExternalLink size={14} /> Instagram
            </a>
            <button onClick={() => saveLeadMutation.mutate()} className="btn-primary text-sm">
              <Star size={14} /> Save Lead
            </button>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="btn-ghost text-sm border border-surface-border"
            >
              {analyzeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Re-analyze
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5 pt-5 border-t border-surface-border">
          {[
            { label: "Followers", value: p.followersCount?.toLocaleString() },
            { label: "Following", value: p.followingCount?.toLocaleString() },
            { label: "Posts", value: p.postsCount?.toLocaleString() },
            { label: "Engagement", value: `${p.engagementRate?.toFixed(2)}%` },
            { label: "Posts/wk", value: p.postFrequency?.toFixed(1) },
            { label: "Lead Score", value: p.leadScore },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 bg-surface-hover rounded-xl">
              <p className="text-white font-bold text-lg">{stat.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Analysis + Radar */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* AI Niche */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Zap size={16} className="text-brand-400" /> AI Analysis
          </h2>

          {p.niche ? (
            <>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Primary Niche</p>
                <span className="bg-brand-500/15 text-brand-300 border border-brand-500/20 px-3 py-1.5 rounded-xl text-sm font-medium">{p.niche}</span>
              </div>

              {p.subNiches?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Sub Niches</p>
                  <div className="flex flex-wrap gap-2">
                    {p.subNiches.map((n: string) => (
                      <span key={n} className="text-xs bg-surface-hover border border-surface-border text-gray-300 px-2.5 py-1 rounded-lg">{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {p.contentThemes?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Content Themes</p>
                  <div className="flex flex-wrap gap-2">
                    {p.contentThemes.map((t: string) => (
                      <span key={t} className="text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-hover rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Heart size={12} className="text-pink-400" />
                    <p className="text-xs text-gray-500">Audience Sentiment</p>
                  </div>
                  <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(p.audienceSentiment || 0) * 100}%` }} />
                  </div>
                  <p className="text-white text-sm font-medium mt-1">{((p.audienceSentiment || 0) * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-surface-hover rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield size={12} className="text-green-400" />
                    <p className="text-xs text-gray-500">Brand Safety</p>
                  </div>
                  <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(p.brandSafetyScore || 0) * 100}%` }} />
                  </div>
                  <p className="text-white text-sm font-medium mt-1">{((p.brandSafetyScore || 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle size={24} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">AI analysis not yet performed</p>
              <button onClick={() => analyzeMutation.mutate()} className="btn-primary mt-3 mx-auto text-sm">
                <Zap size={14} /> Run AI Analysis
              </button>
            </div>
          )}
        </motion.div>

        {/* Radar Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
          <h2 className="text-white font-semibold mb-4">Profile Strength</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e2136" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Radar name="Profile" dataKey="value" stroke="#4f52f8" fill="#4f52f8" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Post Engagement Chart */}
      {postChartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" /> Recent Post Engagement
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={postChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2136" />
              <XAxis dataKey="name" stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <YAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#141626", border: "1px solid #1e2136", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Bar dataKey="likes" fill="#ec4899" radius={[4, 4, 0, 0]} name="Likes" />
              <Bar dataKey="comments" fill="#4f52f8" radius={[4, 4, 0, 0]} name="Comments" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent Posts */}
      {p.posts?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-brand-400" /> Recent Posts
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p.posts.slice(0, 6).map((post: any) => (
              <div key={post.id} className="bg-surface-hover rounded-xl p-3 space-y-2">
                <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">{post.caption || "No caption"}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Heart size={11} className="text-pink-400" />{post.likesCount?.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={11} className="text-blue-400" />{post.commentsCount?.toLocaleString()}</span>
                  {post.postedAt && <span>{format(new Date(post.postedAt), "MMM d")}</span>}
                </div>
                {post.hashtags?.slice(0, 3).map((h: string) => (
                  <span key={h} className="text-xs text-purple-400 mr-1">#{h}</span>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
