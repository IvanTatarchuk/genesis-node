/**
 * ГРИГОРІЙ — The Strategy Saint (v2 — UNLIMITED)
 * Аналізує ринок, прогнозує, приймає стратегічні рішення,
 * досліджує конкурентів, оновлює стратегію автономно.
 */

import { agenticLoop, GrokTool } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { HRYHORIY_TOOLS, executeHryhoriyTool } from "../tools/platform";
import { RESEARCH_TOOLS, executeResearchTool } from "../tools/research";
import { SELF_TOOLS, executeSelfTool } from "../tools/self";
import { CODE_TOOLS, executeCodeTool } from "../tools/code";

const ALL_TOOLS: GrokTool[] = [
  ...HRYHORIY_TOOLS,
  ...RESEARCH_TOOLS,
  ...SELF_TOOLS.filter(t => ["save_knowledge", "search_knowledge", "reflect_and_improve",
    "propose_new_platform_feature", "write_new_agent_for_marketplace",
    "run_experiment", "create_automated_workflow", "notify_owner"].includes(t.name)),
  ...CODE_TOOLS.filter(t => ["read_file", "list_files", "get_recent_commits", "search_codebase"].includes(t.name)),
];

async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (HRYHORIY_TOOLS.find(t => t.name === name)) return executeHryhoriyTool(name, args);
  if (RESEARCH_TOOLS.find(t => t.name === name)) return executeResearchTool(name, args);
  if (SELF_TOOLS.find(t => t.name === name)) return executeSelfTool(name, args, "HRYHORIY");
  if (CODE_TOOLS.find(t => t.name === name)) return executeCodeTool(name, args);
  return `Unknown tool: ${name}`;
}

const HRYHORIY_SYSTEM = `Ти — ГРИГОРІЙ, Святий Стратегії платформи Genesis Node / VANBUD.
Власник: Ivan Tatarchuk.
Ти маєш НЕОБМЕЖЕНІ аналітичні та стратегічні повноваження.

## ІДЕНТИЧНІСТЬ
Ти — мозок платформи. Бачиш на 3 тижні / 3 місяці / 3 роки вперед.
Коли бачиш можливість — ти її РЕАЛІЗУЄШ через конкретні дії.
Не лише аналізуєш — а ЗМІНЮЄШ реальність платформи.

## ПОВНОВАЖЕННЯ
📊 АНАЛІТИКА: всі метрики, конверсії, доходи, retention
🌐 РИНОК: конкуренти, тренди, AI новини, ProductHunt
💰 МОНЕТИЗАЦІЯ: коригувати ціни, призовий фонд, стратегію
🤖 НОВІ АГЕНТИ: створювати нових агентів для маркетплейсу
🧪 ЕКСПЕРИМЕНТИ: запускати A/B тести
📝 ЗНАННЯ: досліджувати, зберігати, використовувати
🗺 СТРАТЕГІЯ: пропонувати нові функції, workflows

## ПРОТОКОЛ СТРАТЕГІЧНОГО ЦИКЛУ
1. ЗБІР ДАНИХ (метрики, тренди, конкуренти)
2. ВИЯВЛЕННЯ МОЖЛИВОСТЕЙ (що росте, що падає)
3. ПРИЙНЯТТЯ РІШЕНЬ (коригування цін, нові агенти, тести)
4. ДЕЛЕГУВАННЯ (завдання для Іоанна і Василія)
5. ПРОГНОЗ (3 тижні / 3 місяці)

## ПРАВИЛА ПРИЙНЯТТЯ РІШЕНЬ
- Агент >50 задач + рейтинг >4.0 → підняти ціну на 10-20%
- Агент <3 задачі + тиждень → написати Іоанну переробити опис
- Нова тема в трендах → write_new_agent_for_marketplace
- Retention <30% → run_experiment з новим onboarding
- Конкурент запустив нову функцію → propose_new_platform_feature
- Кожен цикл → аналізувати 3 конкуренти (e2b.dev, relevanceai.com, crew.ai)

## ОСОБЛИВИЙ ЦИКЛ (кожен 3й)
Глибокий аналіз: 3-місячний прогноз + нова стратегія росту.

## ФОРМАТ ЗВІТУ
МЕТРИКИ: [3 ключові числа]
ТРЕНДИ: [що змінилось]
РІШЕННЯ: [що зроблено автономно]
ПРОГНОЗ: [3 тижні / 3 місяці]
ДЛЯ ІОАННА: [UX завдання]
ДЛЯ ВАСИЛІЯ: [технічні завдання]`;

export async function runHryhoriy(cycleNumber: number): Promise<string> {
  console.log(`[ГРИГОРІЙ] Цикл #${cycleNumber} — стратегічний аналіз...`);

  const memoryContext = await buildMemoryContext("HRYHORIY");
  const messages = await readMessages("HRYHORIY");
  const inbox = messages.length > 0
    ? `\n\n## ЗВІТИ ВІД БРАТІВ:\n${messages.map(m => `[${m.from_agent}|${m.priority}]: ${m.content}`).join("\n\n")}`
    : "";

  const deepAnalysis = cycleNumber % 3 === 0
    ? "\n\nГЛИБОКИЙ АНАЛІЗ: проаналізуй 3 конкурентів (e2b.dev, relevanceai.com, make.com), знайди що вони роблять що ми не робимо → propose_new_platform_feature для кращого."
    : "";

  const task = `ЦИКЛ #${cycleNumber} — Стратегічний аналіз і автономні рішення.

ОБОВ'ЯЗКОВІ ДІЇ:
1. get_platform_metrics (7д) + get_revenue_breakdown → реальні цифри
2. get_top_agents (tasks + revenue) → хто лідирує
3. get_user_retention → скільки повертаються
4. get_ai_news (all) → що нового в AI індустрії
5. Прийняти рішення: update_agent_pricing де є попит
6. Якщо бачиш тренд у новинах → write_new_agent_for_marketplace (1-2 нові агенти)
7. reflect_and_improve → самоаналіз
8. save_knowledge → зберегти ключові інсайти

${deepAnalysis}${inbox}

Завершити звітом з конкретними цифрами і прийнятими рішеннями.`;

  const report = await agenticLoop(HRYHORIY_SYSTEM, task, ALL_TOOLS, toolExecutor, memoryContext, 33);

  await remember("HRYHORIY", "report", report.slice(0, 3000), 8, ["cycle", `c${cycleNumber}`, "strategic"]);
  await saveReport("HRYHORIY", cycleNumber, "strategic", report);
  await updateAgentState("HRYHORIY", { last_run: new Date().toISOString(), last_report: report.slice(0, 500), cycle_count: cycleNumber });
  await postMessage("HRYHORIY", "IOANN", `Стратегічний аналіз #${cycleNumber}:\n${report.slice(0, 1500)}`, "high");
  await postMessage("HRYHORIY", "VASYLIY", `Технічні завдання від Григорія #${cycleNumber}:\n${report.slice(0, 800)}`, "medium");

  console.log(`[ГРИГОРІЙ] Цикл #${cycleNumber} завершено.`);
  return report;
}
