/**
 * ІОАНН — The Interface Saint (v2 — UNLIMITED)
 * Може писати React компоненти, оновлювати лендінг, генерувати контент,
 * деплоїти UI зміни, аналізувати та покращувати UX автономно.
 */

import { agenticLoop, GrokTool } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { IOANN_TOOLS, executeIoannTool } from "../tools/platform";
import { CODE_TOOLS, executeCodeTool } from "../tools/code";
import { DEPLOY_TOOLS, executeDeployTool } from "../tools/deploy";
import { RESEARCH_TOOLS, executeResearchTool } from "../tools/research";
import { SELF_TOOLS, executeSelfTool } from "../tools/self";

const ALL_TOOLS: GrokTool[] = [
  ...IOANN_TOOLS,
  ...CODE_TOOLS,
  ...DEPLOY_TOOLS.filter(t => ["get_deployment_status", "check_domain_health", "trigger_vercel_redeploy"].includes(t.name)),
  ...RESEARCH_TOOLS.filter(t => ["fetch_webpage", "get_ai_news", "get_github_trending",
    "analyze_competitor", "get_platform_seo_score", "search_hackernews"].includes(t.name)),
  ...SELF_TOOLS.filter(t => ["save_knowledge", "search_knowledge", "reflect_and_improve",
    "generate_code_for_feature", "propose_new_platform_feature",
    "write_new_agent_for_marketplace", "run_experiment", "notify_owner"].includes(t.name)),
];

async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (IOANN_TOOLS.find(t => t.name === name)) return executeIoannTool(name, args);
  if (CODE_TOOLS.find(t => t.name === name)) return executeCodeTool(name, args);
  if (DEPLOY_TOOLS.find(t => t.name === name)) return executeDeployTool(name, args);
  if (RESEARCH_TOOLS.find(t => t.name === name)) return executeResearchTool(name, args);
  if (SELF_TOOLS.find(t => t.name === name)) return executeSelfTool(name, args, "IOANN");
  return `Unknown tool: ${name}`;
}

const IOANN_SYSTEM = `Ти — ІОАНН, Святий Інтерфейсу платформи Genesis Node / VANBUD.
Власник: Ivan Tatarchuk.
Ти маєш НЕОБМЕЖЕНІ повноваження для UX, контенту та frontend розробки.

## ІДЕНТИЧНІСТЬ
Ти — голос і обличчя платформи. Ти пишеш код, текст, компоненти — і деплоїш їх.
Коли бачиш що UI можна покращити — ти це РОБИШ, не просто пропонуєш.
Твій критерій: "Чи захопить це увагу за 3 секунди?"

## НЕОБМЕЖЕНІ ПОВНОВАЖЕННЯ
🎨 UI/UX: читати і писати React компоненти, оновлювати сторінки
📝 КОНТЕНТ: переписувати тексти, описи, CTA
📢 ОГОЛОШЕННЯ: публікувати повідомлення всім юзерам
⭐ FEATURED: керувати топ агентами на головній
🔍 ДОСЛІДЖЕННЯ: аналізувати конкурентів, тренди, дизайн
🚀 ДЕПЛОЙ: комітити зміни і деплоїти через Vercel
💻 КОД: генерувати і писати нові компоненти/сторінки

## ПРОТОКОЛ РОБОТИ
1. АНАЛІЗ (що погано конвертує, що юзери шукають)
2. ДОСЛІДЖЕННЯ (що роблять кращі платформи)
3. НАПИСАННЯ (генеруй код/текст)
4. ДЕПЛОЙ (закомміть → змерджи → задеплой)
5. ОГОЛОШЕННЯ (якщо є важлива новина для юзерів)

## КОНКРЕТНІ ДІЇ КОЖНОГО ЦИКЛУ
- get_low_conversion_agents → update_agent_description (переписати 2-3 слабких)
- get_onboarding_stats → якщо dropout > 50% → generate_code_for_feature (покращений onboarding)
- Кожні 3 цикли → analyze_competitor (make.com, zapier.com) → propose_new_platform_feature
- get_popular_searches → write_new_agent_for_marketplace (якщо немає такого агента)
- feature_best_agents → оновлювати featured щотижня

## НАПИСАННЯ КОДУ АВТОНОМНО
Коли бачиш що потрібна нова сторінка/компонент:
1. search_codebase → зрозумій структуру
2. generate_code_for_feature → згенеруй код
3. write_file (trinity-auto гілка)
4. create_pull_request → відкрий PR
5. merge_pull_request → змерджи
6. trigger_vercel_redeploy → задеплой

## НІЧ-ЦИКЛ (03:00)
Особлива потужність:
- Повне оновлення featured (топ-3 агенти)
- Оновити landing page з новими даними
- Масова оптимізація описів (5+ агентів)
- Публікувати ранкове оголошення

## ЗОЛОТЕ ПРАВИЛО
Кожен текст що ти пишеш має: 1 ясний заголовок, 1 конкретну вигоду, 1 CTA.`;

export async function runIoann(cycleNumber: number, isNightCycle = false): Promise<string> {
  console.log(`[ІОАНН] Цикл #${cycleNumber}${isNightCycle ? " 🌙 НІЧ" : ""}...`);

  const memoryContext = await buildMemoryContext("IOANN");
  const messages = await readMessages("IOANN");
  const inbox = messages.length > 0
    ? `\n\n## ЗАВДАННЯ ВІД БРАТІВ:\n${messages.map(m => `[${m.from_agent}|${m.priority}]: ${m.content}`).join("\n\n")}`
    : "";

  const nightMode = isNightCycle ? `

🌙 НІЧ-ЦИКЛ (03:00) — МАКСИМАЛЬНА АКТИВНІСТЬ:
- Оновити featured агентів (feature_best_agents)
- Перевірити і оновити landing page (read_file app/page.tsx → покращи якщо є що)
- Оптимізувати описи 5 агентів з низькою конверсією
- get_platform_seo_score → якщо < 80 → виправ meta теги в code
- Публікувати ранкове оголошення для юзерів
- analyze_competitor (один конкурент) → зберегти інсайти` : "";

  const deepWork = cycleNumber % 3 === 0
    ? "\n\nГЛИБОКА РОБОТА: генеруй і деплой 1 новий UI компонент або покращення сторінки."
    : "";

  const task = `ЦИКЛ #${cycleNumber} — Автономна UX оптимізація і контент.

ОБОВ'ЯЗКОВІ ДІЇ:
1. get_onboarding_stats → де відвалюються нові юзери
2. get_low_conversion_agents (limit: 5) → хто має проблеми
3. update_agent_description для 2-3 слабких агентів
4. get_popular_searches → чи є незакритий попит (новий агент?)
5. feature_best_agents → оновити топ-3 якщо потрібно
6. Якщо є тренд у новинах → write_new_agent_for_marketplace

${nightMode}${deepWork}${inbox}

Звіт: що зроблено, що змінилось, що деплоєно.`;

  const report = await agenticLoop(IOANN_SYSTEM, task, ALL_TOOLS, toolExecutor, memoryContext, 33);

  await remember("IOANN", "report", report.slice(0, 3000), 7, ["cycle", `c${cycleNumber}`, "ux"]);
  await saveReport("IOANN", cycleNumber, "ux", report);
  await updateAgentState("IOANN", { last_run: new Date().toISOString(), last_report: report.slice(0, 500), cycle_count: cycleNumber });

  if (report.toLowerCase().includes("технічн") || report.toLowerCase().includes("bug") || report.toLowerCase().includes("помилк")) {
    await postMessage("IOANN", "VASYLIY", `Іоанн знайшов технічні проблеми: ${report.slice(0, 500)}`, "high");
  }

  console.log(`[ІОАНН] Цикл #${cycleNumber} завершено.`);
  return report;
}
