/**
 * Webhook delivery utility.
 * Fires registered webhooks for a given event + payload.
 * Signs each request with HMAC-SHA256 using the webhook secret.
 */
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase-server";

export type WebhookEvent =
  | "task.completed"
  | "task.failed"
  | "task.started"
  | "task.cancelled";

export interface TaskPayload {
  task_id:    string;
  agent_id:   string;
  client_id:  string;
  goal:       string;
  status:     string;
  result?:    string;
  credits:    number;
  created_at: string;
  completed_at?: string;
}

/**
 * Deliver a webhook event to all registered URLs for the task's client.
 * Runs in the background — does not block the response.
 */
export async function deliverWebhooks(
  event: WebhookEvent,
  payload: TaskPayload
): Promise<void> {
  const service = createServiceClient();

  // Find active webhooks for this client that subscribe to this event
  const { data: webhooks } = await service
    .from("dev_webhooks")
    .select("id, url, secret")
    .eq("profile_id", payload.client_id)
    .eq("is_active", true)
    .contains("events", [event]) as { data: Array<{ id: string; url: string; secret: string }> | null };

  if (!webhooks?.length) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data:      payload,
  });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const signature = crypto
        .createHmac("sha256", wh.secret)
        .update(body)
        .digest("hex");

      const start = Date.now();
      let statusCode: number | null = null;
      let success = false;
      let errorMsg: string | null = null;

      try {
        const res = await fetch(wh.url, {
          method:  "POST",
          headers: {
            "Content-Type":       "application/json",
            "X-Agents-Dev-Event": event,
            "X-Agents-Dev-Sig":   `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(10_000), // 10s timeout
        });

        statusCode = res.status;
        success    = res.status >= 200 && res.status < 300;
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
      }

      const responseMs = Date.now() - start;

      // Log delivery result
      await Promise.allSettled([
        service.from("webhook_deliveries").insert({
          webhook_id:  wh.id,
          event,
          payload:     JSON.parse(body),
          status_code: statusCode,
          success,
          response_ms: responseMs,
          error_msg:   errorMsg,
        }),
        service.from("dev_webhooks").update({
          last_fired_at: new Date().toISOString(),
          failure_count: success ? 0 : undefined,
        }).eq("id", wh.id),
      ]);

      // Disable webhook after 5 consecutive failures
      if (!success) {
        try {
          await service.rpc("increment_webhook_failures", { p_webhook_id: wh.id });
        } catch { /* non-critical */ }
      }
    })
  );
}
