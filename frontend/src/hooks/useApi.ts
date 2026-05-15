import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { discoveryApi, profileApi, analyticsApi, leadApi, exportApi } from "../services/api";
import toast from "react-hot-toast";

// ─── Discovery Hooks ──────────────────────────────────────────────────────────

export function useDiscoveryJobs(status?: string) {
  return useQuery({
    queryKey: ["discovery", "jobs", status],
    queryFn: () => discoveryApi.getJobs({ status }).then((r) => r.data.data),
    refetchInterval: 5000,
  });
}

export function useDiscoveryJob(id: string) {
  return useQuery({
    queryKey: ["discovery", "job", id],
    queryFn: () => discoveryApi.getJob(id).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: (data: any) =>
      data?.status === "RUNNING" ? 3000 : false,
  });
}

export function useStartDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: any) => discoveryApi.start(params),
    onSuccess: () => {
      toast.success("🚀 Discovery job started!");
      qc.invalidateQueries({ queryKey: ["discovery", "jobs"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to start discovery"),
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => discoveryApi.cancelJob(id),
    onSuccess: () => {
      toast.success("Job cancelled");
      qc.invalidateQueries({ queryKey: ["discovery", "jobs"] });
    },
  });
}

// ─── Profile Hooks ────────────────────────────────────────────────────────────

export function useProfiles(filters?: any) {
  return useQuery({
    queryKey: ["profiles", filters],
    queryFn: () => profileApi.list(filters).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: ["profile", id],
    queryFn: () => profileApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useAnalyzeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => profileApi.analyze(id),
    onSuccess: (_, id) => {
      toast.success("AI analysis queued — results in ~30s");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["profile", id] }), 35000);
    },
  });
}

// ─── Analytics Hooks ──────────────────────────────────────────────────────────

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview().then((r) => r.data.data),
    refetchInterval: 30000,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAnalyticsTrends(days = 30) {
  return useQuery({
    queryKey: ["analytics", "trends", days],
    queryFn: () => analyticsApi.trends(days).then((r) => r.data.data.trends),
    staleTime: 1000 * 60 * 5,
  });
}

export function useNicheDistribution() {
  return useQuery({
    queryKey: ["analytics", "niches"],
    queryFn: () => analyticsApi.niches().then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Lead Hooks ───────────────────────────────────────────────────────────────

export function useLeads(filters?: any) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => leadApi.list(filters).then((r) => r.data.data),
    refetchInterval: 15000,
  });
}

export function useSaveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => leadApi.create(data),
    onSuccess: () => {
      toast.success("✅ Saved to leads pipeline");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("Already in leads pipeline"),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => leadApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// ─── Export Hooks ─────────────────────────────────────────────────────────────

export function useExportJobs() {
  return useQuery({
    queryKey: ["export", "jobs"],
    queryFn: () => exportApi.getJobs().then((r) => r.data.data),
    refetchInterval: 5000,
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => exportApi.create(data),
    onSuccess: () => {
      toast.success("📤 Export started! Download available shortly.");
      qc.invalidateQueries({ queryKey: ["export", "jobs"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Export failed"),
  });
}
