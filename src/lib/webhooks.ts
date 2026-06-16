import { getProjectBySlug } from "./db/projects";

export interface WebhookPayload {
  event: "article.publish" | "article.update";
  projectSlug: string;
  articleSlug: string;
  title: string;
  updatedAt: number;
}

export function triggerWebhook(projectSlug: string, payload: Omit<WebhookPayload, "projectSlug">) {
  Promise.resolve().then(async () => {
    try {
      const project = getProjectBySlug(projectSlug);
      if (!project || !project.webhookUrl) return;

      const fullPayload: WebhookPayload = { ...payload, projectSlug };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      try {
        const response = await fetch(project.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Inscribe-Docs-Webhook/1.0",
          },
          body: JSON.stringify(fullPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error(`Webhook to ${project.webhookUrl} failed: HTTP ${response.status}`);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Error sending webhook:", err);
      }
    }
  });
}
