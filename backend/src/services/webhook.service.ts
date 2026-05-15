import axios from "axios";
import { logger } from "../config/logger";

export const webhookService = {
  async notifySlack(message: string, blocks?: any[]): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await axios.post(webhookUrl, {
        text: message,
        blocks: blocks || [{ type: "section", text: { type: "mrkdwn", text: message } }],
      });
    } catch (error: any) {
      logger.warn("Slack webhook failed", { error: error.message });
    }
  },

  async notifyDiscoveryComplete(jobId: string, profilesFound: number, userId: string): Promise<void> {
    await this.notifySlack(
      `✅ *Discovery Job Completed*\n` +
      `Job ID: \`${jobId}\`\n` +
      `Profiles found: *${profilesFound}*\n` +
      `User: ${userId}`
    );
  },

  async notifyHighValueLead(username: string, score: number, niche: string): Promise<void> {
    if (score < 75) return; // Only notify for qualified leads

    await this.notifySlack(
      `🔥 *High-Value Lead Discovered!*\n` +
      `Instagram: @${username}\n` +
      `Lead Score: *${score}/100*\n` +
      `Niche: ${niche}`
    );
  },

  async sendZapierWebhook(eventType: string, data: Record<string, any>): Promise<void> {
    const zapierUrl = process.env.ZAPIER_WEBHOOK_URL;
    if (!zapierUrl) return;

    try {
      await axios.post(zapierUrl, {
        event: eventType,
        timestamp: new Date().toISOString(),
        data,
      });
    } catch (error: any) {
      logger.warn("Zapier webhook failed", { error: error.message });
    }
  },

  async syncToHubSpot(contact: {
    email?: string;
    firstName?: string;
    lastName?: string;
    instagramHandle?: string;
    leadScore?: number;
  }): Promise<string | null> {
    const apiKey = process.env.HUBSPOT_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          properties: {
            email: contact.email,
            firstname: contact.firstName,
            lastname: contact.lastName,
            instagram_handle: contact.instagramHandle,
            lead_score: contact.leadScore,
            hs_lead_status: "NEW",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.id;
    } catch (error: any) {
      logger.warn("HubSpot sync failed", { error: error.message });
      return null;
    }
  },
};
