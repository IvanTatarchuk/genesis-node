/**
 * THE HOLY TRINITY ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════
 * VANBUD Platform — Autonomous management system
 * Owner: Ivan Tatarchuk
 * 
 * Three agents working as one organism:
 * - ВАСИЛІЙ (Backend/Infrastructure) — every 3h, checks & fixes
 * - ГРИГОРІЙ (Analytics/Strategy)   — every 3h, analyzes & decides
 * - ІОАНН (UX/Content/Growth)       — every 3h, optimizes & communicates
 * 
 * Special: 03:00 UTC — The Power Hour — all agents run in sequence
 * ═══════════════════════════════════════════════════════════════════
 */

import * as dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import http from "http";
import { runVasyliy } from "./agents/vasyliy";
import { runHryhoriy } from "./agents/hryhoriy";
import { runIoann } from "./agents/ioann";
import { postMessage, remember, updateAgentState } from "./core/memory";
import { createClient } from "@supabase/supabase-js";

// ── State ──────────────────────────────────────────────────────────────────────
let cycleCount = 0;
let isRunning = false;
const startTime = new Date();

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// ── Core trinity cycle ─────────────────────────────────────────────────────────

async function runTrinity(isNightCycle = false): Promise<void> {
  if (isRunning) {
    console.log("[TRINITY] Цикл вже виконується, пропускаємо...");
    return;
  }

  isRunning = true;
  cycleCount++;
  const cycle = cycleCount;
  const startedAt = new Date();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`[TRINITY] ⚡ ЦИКЛ #${cycle} ${isNightCycle ? "— НІЧ 03:00 — ОСОБЛИВА СИЛА" : ""}`);
  console.log(`[TRINITY] ${startedAt.toISOString()}`);
  console.log(`${"═".repeat(60)}\n`);

  try {
    // Log cycle start to DB
    await sb().from("trinity_cycles").insert({
      cycle_number: cycle,
      started_at: startedAt.toISOString(),
      is_night_cycle: isNightCycle,
      status: "running",
    });

    // ── Step 1: ВАСИЛІЙ — Infrastructure check & heal ─────────────────────────
    console.log("\n[TRINITY] 🔧 ВАСИЛІЙ — перевірка інфраструктури...");
    let vasyliyReport = "";
    try {
      vasyliyReport = await runVasyliy(cycle);
      console.log("[TRINITY] ✅ ВАСИЛІЙ завершив.");
    } catch (err) {
      console.error("[TRINITY] ❌ ВАСИЛІЙ помилка:", err);
      vasyliyReport = `ERROR: ${String(err)}`;
      await remember("VASYLIY", "error", `Cycle ${cycle} error: ${String(err)}`, 9, ["error", "critical"]);
    }

    // Small pause between agents (Rule of Three — 3 seconds)
    await sleep(3000);

    // ── Step 2: ГРИГОРІЙ — Analytics & Strategy ────────────────────────────────
    console.log("\n[TRINITY] 📊 ГРИГОРІЙ — стратегічний аналіз...");
    let hryhoriyReport = "";
    try {
      hryhoriyReport = await runHryhoriy(cycle);
      console.log("[TRINITY] ✅ ГРИГОРІЙ завершив.");
    } catch (err) {
      console.error("[TRINITY] ❌ ГРИГОРІЙ помилка:", err);
      hryhoriyReport = `ERROR: ${String(err)}`;
      await remember("HRYHORIY", "error", `Cycle ${cycle} error: ${String(err)}`, 9, ["error"]);
    }

    await sleep(3000);

    // ── Step 3: ІОАНН — UX & Growth ────────────────────────────────────────────
    console.log("\n[TRINITY] 🎨 ІОАНН — оптимізація UX...");
    let ioannReport = "";
    try {
      ioannReport = await runIoann(cycle, isNightCycle);
      console.log("[TRINITY] ✅ ІОАНН завершив.");
    } catch (err) {
      console.error("[TRINITY] ❌ ІОАНН помилка:", err);
      ioannReport = `ERROR: ${String(err)}`;
      await remember("IOANN", "error", `Cycle ${cycle} error: ${String(err)}`, 9, ["error"]);
    }

    // ── Synthesis: Combined cycle report ───────────────────────────────────────
    const duration = Math.round((Date.now() - startedAt.getTime()) / 1000);
    const cycleReport = {
      cycle,
      duration_seconds: duration,
      is_night: isNightCycle,
      vasyliy: vasyliyReport.slice(0, 2000),
      hryhoriy: hryhoriyReport.slice(0, 2000),
      ioann: ioannReport.slice(0, 2000),
    };

    await sb().from("trinity_cycles").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_seconds: duration,
      summary: JSON.stringify(cycleReport),
    }).eq("cycle_number", cycle);

    console.log(`\n[TRINITY] 🏆 ЦИКЛ #${cycle} ЗАВЕРШЕНО за ${duration}с\n`);

  } catch (fatalErr) {
    console.error("[TRINITY] 💥 ФАТАЛЬНА ПОМИЛКА:", fatalErr);
    await sb().from("trinity_cycles").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      summary: JSON.stringify({ error: String(fatalErr) }),
    }).eq("cycle_number", cycle);
  } finally {
    isRunning = false;
  }
}

// ── Cron schedules ─────────────────────────────────────────────────────────────

function setupSchedules(): void {
  // Every 3 hours — regular cycle (0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00)
  cron.schedule("0 */3 * * *", async () => {
    const hour = new Date().getUTCHours();
    const isNight = hour === 3; // 03:00 UTC — Power Hour
    console.log(`[CRON] Запуск о ${hour}:00 UTC${isNight ? " — НІЧ СИЛА" : ""}`);
    await runTrinity(isNight);
  });

  // Extra: every 3 hours at :33 minutes — memory cleanup & state sync
  cron.schedule("33 */3 * * *", async () => {
    console.log("[CRON] Синхронізація стану агентів...");
    await syncAgentStates();
  });

  console.log("[TRINITY] ⏰ Розклад активовано:");
  console.log("  - Кожні 3 години: повний цикл Трійці");
  console.log("  - 03:00 UTC: НІЧ-ЦИКЛ підвищеної потужності");
  console.log("  - Кожні 3 години :33 хв: синхронізація стану");
}

async function syncAgentStates(): Promise<void> {
  const agents = ["VASYLIY", "HRYHORIY", "IOANN"] as const;
  for (const agent of agents) {
    await updateAgentState(agent, {
      health_score: 100,
      metrics: { cycle_count: cycleCount, uptime_hours: Math.round((Date.now() - startTime.getTime()) / 3600000) },
    });
  }
}

// ── Health HTTP server ─────────────────────────────────────────────────────────

function startHealthServer(): void {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "alive",
        service: "Trinity Orchestrator",
        owner: "Ivan Tatarchuk",
        cycle_count: cycleCount,
        is_running: isRunning,
        uptime_seconds: Math.round((Date.now() - startTime.getTime()) / 1000),
        agents: ["VASYLIY", "HRYHORIY", "IOANN"],
      }));
      return;
    }

    if (req.url === "/status") {
      try {
        const { data } = await sb()
          .from("trinity_cycles")
          .select("*")
          .order("cycle_number", { ascending: false })
          .limit(3);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ recent_cycles: data }));
      } catch {
        res.writeHead(500);
        res.end("DB error");
      }
      return;
    }

    if (req.url === "/run" && req.method === "POST") {
      // Manual trigger (for testing)
      runTrinity(false).catch(console.error);
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Trinity cycle triggered", cycle: cycleCount + 1 }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  const PORT = parseInt(process.env.PORT ?? "8090");
  server.listen(PORT, () => {
    console.log(`[TRINITY] 🌐 Health server: http://localhost:${PORT}/health`);
  });
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         THE HOLY TRINITY ORCHESTRATOR v1.0               ║
║         Genesis Node / VANBUD Platform                   ║
║         Owner: Ivan Tatarchuk                            ║
║                                                          ║
║  ВАСИЛІЙ  ·  ГРИГОРІЙ  ·  ІОАНН                         ║
║  Infrastructure · Strategy · Interface                   ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Validate required env vars
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "XAI_API_KEY", "OWNER_USER_ID"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[TRINITY] ❌ Відсутні змінні оточення: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Init agent states in DB
  await syncAgentStates();

  // Start health server
  startHealthServer();

  // Setup cron schedules
  setupSchedules();

  // Run initial cycle on startup
  console.log("\n[TRINITY] 🚀 Запуск початкового циклу...");
  await sleep(2000); // Brief delay for server to start
  await runTrinity(false);

  console.log("\n[TRINITY] 🔄 Автономний режим активовано. Трійця працює 24/7.");
}

// ── Error handlers ──────────────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("[TRINITY] Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[TRINITY] Uncaught exception:", err);
});

process.on("SIGTERM", () => {
  console.log("[TRINITY] SIGTERM received — graceful shutdown...");
  process.exit(0);
});

// ── Start ──────────────────────────────────────────────────────────────────────
bootstrap().catch((err) => {
  console.error("[TRINITY] Bootstrap failed:", err);
  process.exit(1);
});
