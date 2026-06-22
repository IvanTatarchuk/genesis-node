import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import type { WebhookEvent, TaskPayload } from "../deliver-webhook";

// ── Mock Supabase ──────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({});
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
const mockRpc = vi.fn().mockResolvedValue({});
const mockContains = vi.fn();
const mockEqActive = vi.fn();
const mockEqProfile = vi.fn();

function buildQueryChain(data: unknown[] | null) {
  mockContains.mockReturnValue({ data });
  mockEqActive.mockReturnValue({ contains: mockContains });
  mockEqProfile.mockReturnValue({ eq: mockEqActive });
  return { eq: mockEqProfile };
}

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === "dev_webhooks") {
    return {
      select: vi.fn().mockReturnValue(buildQueryChain(null)),
      update: mockUpdate,
    };
  }
  if (table === "webhook_deliveries") {
    return { insert: mockInsert };
  }
  return { insert: mockInsert, update: mockUpdate };
});

const mockServiceClient = {
  from: mockFrom,
  rpc: mockRpc,
};

vi.mock("@/lib/supabase-server", () => ({
  createServiceClient: () => mockServiceClient,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { deliverWebhooks } = await import("../deliver-webhook");

// ── Test data ──────────────────────────────────────────────────────────────────

const samplePayload: TaskPayload = {
  task_id: "task-123",
  agent_id: "agent-456",
  client_id: "client-789",
  goal: "Test goal",
  status: "completed",
  result: "Success",
  credits: 100,
  created_at: "2025-01-01T00:00:00Z",
  completed_at: "2025-01-01T00:05:00Z",
};

const sampleWebhook = {
  id: "wh-1",
  url: "https://example.com/webhook",
  secret: "test-secret-key",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("deliverWebhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when no webhooks are registered", async () => {
    // Default mock returns null
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain(null)),
        };
      }
      return { insert: mockInsert };
    });

    await deliverWebhooks("task.completed", samplePayload);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does nothing when webhooks array is empty", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([])),
        };
      }
      return { insert: mockInsert };
    });

    await deliverWebhooks("task.completed", samplePayload);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends POST request with correct headers and signature", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook])),
          update: mockUpdate,
        };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockResolvedValue({ status: 200 });

    await deliverWebhooks("task.completed", samplePayload);

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://example.com/webhook");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers["X-Agents-Dev-Event"]).toBe("task.completed");
    expect(opts.headers["X-Agents-Dev-Sig"]).toMatch(/^sha256=[a-f0-9]{64}$/);

    // Verify the signature is valid HMAC-SHA256
    const body = opts.body;
    const expectedSig = crypto
      .createHmac("sha256", sampleWebhook.secret)
      .update(body)
      .digest("hex");
    expect(opts.headers["X-Agents-Dev-Sig"]).toBe(`sha256=${expectedSig}`);
  });

  it("includes correct payload structure in request body", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook])),
          update: mockUpdate,
        };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockResolvedValue({ status: 200 });

    await deliverWebhooks("task.started", samplePayload);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.event).toBe("task.started");
    expect(body.timestamp).toBeTruthy();
    expect(body.data).toEqual(samplePayload);
  });

  it("logs delivery result on success", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook])),
          update: mockUpdate,
        };
      }
      if (table === "webhook_deliveries") {
        return { insert: mockInsert };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockResolvedValue({ status: 200 });

    await deliverWebhooks("task.completed", samplePayload);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_id: "wh-1",
        event: "task.completed",
        status_code: 200,
        success: true,
      }),
    );
  });

  it("logs delivery result on fetch failure", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook])),
          update: mockUpdate,
        };
      }
      if (table === "webhook_deliveries") {
        return { insert: mockInsert };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockRejectedValue(new Error("Network error"));

    await deliverWebhooks("task.failed", samplePayload);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_id: "wh-1",
        event: "task.failed",
        status_code: null,
        success: false,
        error_msg: "Network error",
      }),
    );
  });

  it("calls increment_webhook_failures RPC on non-2xx response", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook])),
          update: mockUpdate,
        };
      }
      if (table === "webhook_deliveries") {
        return { insert: mockInsert };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockResolvedValue({ status: 500 });

    await deliverWebhooks("task.failed", samplePayload);

    expect(mockRpc).toHaveBeenCalledWith("increment_webhook_failures", {
      p_webhook_id: "wh-1",
    });
  });

  it("does not call increment_webhook_failures on success", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook])),
          update: mockUpdate,
        };
      }
      if (table === "webhook_deliveries") {
        return { insert: mockInsert };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockResolvedValue({ status: 200 });

    await deliverWebhooks("task.completed", samplePayload);

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("delivers to multiple webhooks in parallel", async () => {
    const webhook2 = { id: "wh-2", url: "https://other.com/hook", secret: "secret-2" };

    mockFrom.mockImplementation((table: string) => {
      if (table === "dev_webhooks") {
        return {
          select: vi.fn().mockReturnValue(buildQueryChain([sampleWebhook, webhook2])),
          update: mockUpdate,
        };
      }
      if (table === "webhook_deliveries") {
        return { insert: mockInsert };
      }
      return { insert: mockInsert, update: mockUpdate };
    });

    mockFetch.mockResolvedValue({ status: 200 });

    await deliverWebhooks("task.completed", samplePayload);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toContain("https://example.com/webhook");
    expect(urls).toContain("https://other.com/hook");
  });
});

describe("WebhookEvent type coverage", () => {
  it("supports all documented events", () => {
    const events: WebhookEvent[] = [
      "task.completed",
      "task.failed",
      "task.started",
      "task.cancelled",
    ];
    expect(events).toHaveLength(4);
  });
});

describe("TaskPayload shape", () => {
  it("has all required fields", () => {
    const p: TaskPayload = {
      task_id: "t1",
      agent_id: "a1",
      client_id: "c1",
      goal: "g",
      status: "s",
      credits: 0,
      created_at: "2025-01-01",
    };
    expect(p.task_id).toBe("t1");
    expect(p.result).toBeUndefined();
    expect(p.completed_at).toBeUndefined();
  });
});
