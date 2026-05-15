import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Download, FileText, Table, Code, Loader2,
  CheckCircle, Clock, XCircle, ExternalLink
} from "lucide-react";
import { exportApi } from "../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

const FORMAT_OPTIONS = [
  { value: "CSV",   icon: Table,    label: "CSV",   desc: "Spreadsheet compatible", color: "text-green-400" },
  { value: "EXCEL", icon: FileText, label: "Excel", desc: "Microsoft Excel .xlsx",  color: "text-blue-400" },
  { value: "JSON",  icon: Code,     label: "JSON",  desc: "Raw JSON data",          color: "text-purple-400" },
];

const STATUS_ICONS = {
  PENDING:   { icon: Clock,        className: "text-yellow-400" },
  RUNNING:   { icon: Loader2,      className: "text-brand-400 animate-spin" },
  COMPLETED: { icon: CheckCircle,  className: "text-green-400" },
  FAILED:    { icon: XCircle,      className: "text-red-400" },
};

export default function ExportPage() {
  const qc = useQueryClient();
  const [format, setFormat] = useState("CSV");
  const [minScore, setMinScore] = useState(0);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["export", "jobs"],
    queryFn: () => exportApi.getJobs().then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () => exportApi.create({ format, filters: { minScore: minScore || undefined } }),
    onSuccess: () => {
      toast.success("📤 Export job started!");
      qc.invalidateQueries({ queryKey: ["export", "jobs"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Export failed"),
  });

  const jobs = jobsData || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Export Data</h1>
        <p className="text-gray-400 text-sm mt-1">Download discovered profiles in your preferred format</p>
      </div>

      {/* Export Config */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-5">
        <h2 className="text-white font-semibold text-sm">Configure Export</h2>

        {/* Format Selection */}
        <div>
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3 block">Export Format</label>
          <div className="grid grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  format === opt.value
                    ? "border-brand-500/40 bg-brand-500/10"
                    : "border-surface-border bg-surface-hover hover:border-surface-hover"
                }`}
              >
                <opt.icon size={20} className={`${opt.color} mb-2`} />
                <p className="text-white text-sm font-medium">{opt.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div>
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">
            Min Lead Score (0 = all)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range" min="0" max="100" value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 accent-brand-500"
            />
            <span className="text-white font-bold w-8 text-right">{minScore}</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="btn-primary w-full justify-center py-3"
        >
          {createMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Preparing export...</>
          ) : (
            <><Download size={16} /> Export as {format}</>
          )}
        </motion.button>
      </motion.div>

      {/* Export History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <h2 className="text-white font-semibold text-sm">Export History</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-brand-400 mx-auto" /></div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center">
            <Download size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No exports yet</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {jobs.map((job: any) => {
              const statusConfig = STATUS_ICONS[job.status as keyof typeof STATUS_ICONS];
              const filename = job.fileUrl?.split("/").pop();
              return (
                <div key={job.id} className="p-4 flex items-center gap-4 hover:bg-surface-hover/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center flex-shrink-0">
                    <statusConfig.icon size={15} className={statusConfig.className} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{job.format}</span>
                      <span className="text-xs text-gray-500 bg-surface-border px-2 py-0.5 rounded capitalize">{job.status.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      {job.recordCount > 0 && <span>{job.recordCount.toLocaleString()} records</span>}
                      <span>{format(new Date(job.createdAt), "MMM d, h:mm a")}</span>
                      {job.expiresAt && <span>Expires {format(new Date(job.expiresAt), "MMM d")}</span>}
                    </div>
                  </div>
                  {job.status === "COMPLETED" && job.fileUrl && filename && (
                    <a
                      href={exportApi.download(filename)}
                      download
                      className="btn-secondary text-xs"
                    >
                      <Download size={13} /> Download
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
