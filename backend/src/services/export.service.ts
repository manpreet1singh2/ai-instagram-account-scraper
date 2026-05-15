import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { prisma } from "../config/database";
import { logger } from "../config/logger";

const EXPORT_DIR = process.env.EXPORT_DIR || "./exports";

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

interface ExportOptions {
  exportJobId: string;
  userId: string;
  format: "CSV" | "EXCEL" | "JSON";
  filters?: {
    jobId?: string;
    minScore?: number;
    niche?: string;
    minFollowers?: number;
    maxFollowers?: number;
  };
}

interface ExportResult {
  fileUrl: string;
  recordCount: number;
}

export const exportService = {
  async generateExport(options: ExportOptions): Promise<ExportResult> {
    const { exportJobId, userId, format, filters = {} } = options;

    // Build query
    const where: any = { discoveryJob: { userId } };
    if (filters.jobId) where.discoveryJobId = filters.jobId;
    if (filters.minScore) where.leadScore = { gte: filters.minScore };
    if (filters.niche) where.niche = { contains: filters.niche, mode: "insensitive" };
    if (filters.minFollowers || filters.maxFollowers) {
      where.followersCount = {};
      if (filters.minFollowers) where.followersCount.gte = filters.minFollowers;
      if (filters.maxFollowers) where.followersCount.lte = filters.maxFollowers;
    }

    const profiles = await prisma.profile.findMany({
      where,
      orderBy: { leadScore: "desc" },
      take: 10000, // Max 10K records per export
    });

    const records = profiles.map((p) => ({
      Username: p.username,
      "Full Name": p.fullName || "",
      Bio: p.bio || "",
      Website: p.website || "",
      Followers: p.followersCount,
      Following: p.followingCount,
      Posts: p.postsCount,
      "Engagement Rate (%)": p.engagementRate.toFixed(2),
      "Posts/Week": p.postFrequency.toFixed(1),
      Niche: p.niche || "",
      "Sub Niches": p.subNiches.join(", "),
      "Content Themes": p.contentThemes.join(", "),
      "Lead Score": p.leadScore,
      "Lead Tier": p.leadTier,
      Verified: p.isVerified ? "Yes" : "No",
      "Brand Safety": p.brandSafetyScore ? `${(p.brandSafetyScore * 100).toFixed(0)}%` : "",
      "Audience Sentiment": p.audienceSentiment ? `${(p.audienceSentiment * 100).toFixed(0)}%` : "",
      "Profile URL": `https://instagram.com/${p.username}`,
      "Data Fetched": p.dataFetchedAt.toISOString().split("T")[0],
    }));

    const filename = `${exportJobId}-${Date.now()}.${format === "CSV" ? "csv" : format === "EXCEL" ? "xlsx" : "json"}`;
    const filePath = path.join(EXPORT_DIR, filename);

    switch (format) {
      case "CSV":
        await this.exportToCSV(records, filePath);
        break;
      case "EXCEL":
        await this.exportToExcel(records, filePath);
        break;
      case "JSON":
        await this.exportToJSON(profiles, filePath);
        break;
    }

    logger.info(`Export generated: ${filename}`, { records: profiles.length, format });

    return {
      fileUrl: `/api/export/download/${filename}`,
      recordCount: profiles.length,
    };
  },

  async exportToCSV(records: Record<string, any>[], filePath: string): Promise<void> {
    if (records.length === 0) {
      fs.writeFileSync(filePath, "No records found\n");
      return;
    }

    const headers = Object.keys(records[0]);
    const rows = records.map((r) =>
      headers.map((h) => `"${String(r[h] || "").replace(/"/g, '""')}"`).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    fs.writeFileSync(filePath, csv, "utf8");
  },

  async exportToExcel(records: Record<string, any>[], filePath: string): Promise<void> {
    const wb = XLSX.utils.book_new();

    // Main data sheet
    const ws = XLSX.utils.json_to_sheet(records);

    // Style header row
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
      };
    }

    // Auto column widths
    const colWidths = Object.keys(records[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...records.map((r) => String(r[key] || "").length), 10),
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Instagram Profiles");

    // Summary sheet
    const summaryData = [
      { Metric: "Total Profiles", Value: records.length },
      { Metric: "Qualified Leads", Value: records.filter((r) => r["Lead Tier"] === "QUALIFIED").length },
      { Metric: "Hot Leads", Value: records.filter((r) => r["Lead Tier"] === "HOT").length },
      { Metric: "Warm Leads", Value: records.filter((r) => r["Lead Tier"] === "WARM").length },
      { Metric: "Cold Leads", Value: records.filter((r) => r["Lead Tier"] === "COLD").length },
      { Metric: "Avg Lead Score", Value: Math.round(records.reduce((s, r) => s + Number(r["Lead Score"]), 0) / records.length) },
      { Metric: "Avg Engagement Rate", Value: (records.reduce((s, r) => s + Number(r["Engagement Rate (%)"]), 0) / records.length).toFixed(2) + "%" },
      { Metric: "Export Date", Value: new Date().toLocaleDateString() },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    XLSX.writeFile(wb, filePath);
  },

  async exportToJSON(profiles: any[], filePath: string): Promise<void> {
    const data = {
      exportDate: new Date().toISOString(),
      totalRecords: profiles.length,
      profiles: profiles.map((p) => ({
        username: p.username,
        fullName: p.fullName,
        bio: p.bio,
        website: p.website,
        stats: {
          followers: p.followersCount,
          following: p.followingCount,
          posts: p.postsCount,
          engagementRate: p.engagementRate,
          postFrequency: p.postFrequency,
        },
        ai: {
          niche: p.niche,
          subNiches: p.subNiches,
          contentThemes: p.contentThemes,
          audienceSentiment: p.audienceSentiment,
          brandSafetyScore: p.brandSafetyScore,
        },
        lead: {
          score: p.leadScore,
          tier: p.leadTier,
        },
        meta: {
          isVerified: p.isVerified,
          profileUrl: `https://instagram.com/${p.username}`,
          dataFetchedAt: p.dataFetchedAt,
        },
      })),
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  },

  getFilePath(filename: string): string {
    return path.join(EXPORT_DIR, filename);
  },
};
