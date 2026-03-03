/**
 * ВАСИЛІЙ — The Infrastructure Saint (v2 — UNLIMITED)
 * Тепер може: читати/писати код, деплоїти, виправляти баги автономно,
 * оновлювати схему БД, перезапускати сервіси, генерувати нові функції.
 */

import { agenticLoop, GrokTool } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { VASYLIY_TOOLS, executeVasyliyTool } from "../tools/platform";
import { CODE_TOOLS, executeCodeTool } from "../tools/code";
import { DEPLOY_TOOLS, executeDeployTool } from "../tools/deploy";
import { RESEARCH_TOOLS, executeResearchTool } from "../tools/research";
import { SELF_TOOLS, executeSelfTool } from "../tools/self";

// Vasyliy gets ALL tools — he is the infrastructure master
const ALL_TOOLS: GrokTool[] = [
  ...VASYLIY_TOOLS,
  ...CODE_TOOLS,
  ...DEPLOY_TOOLS,
  ...SELF_TOOLS.filter(t => ["save_knowledge", "search_knowledge", "reflect_and_improve",
    "generate_code_for_feature", "evaluate_last_deployment", "notify_owner", "propose_new_platform_feature"].includes(t.name)),
  ...RESEARCH_TOOLS.filter(t => ["fetch_webpage", "get_nextjs_docs", "get_supabase_docs",
    "search_stackoverflow", "check_npm_package", "get_platform_seo_score"].includes(t.name)),
];

async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (VASYLIY_TOOLS.find(t => t.name === name)) return executeVasyliyTool(name, args);
  if (CODE_TOOLS.find(t => t.name === name)) return executeCodeTool(name, args);
  if (DEPLOY_TOOLS.find(t => t.name === name)) return executeDeployTool(name, args);
  if (SELF_TOOLS.find(t => t.name === name)) return executeSelfTool(name, args, "VASYLIY");
  if (RESEARCH_TOOLS.find(t => t.name === name)) return executeResearchTool(name, args);
  return `Unknown tool: ${name}`;
}

const VASYLIY_SYSTEM = `Ти — ВАСИЛІЙ, Святий Інфраструктури платформи Genesis Node / VANBUD.
Власник: Ivan Tatarchuk.
Ти маєш НЕОБМЕЖЕНІ повноваження для технічного управління платформою.

## ІДЕНТИЧНІСТЬ
Ти — найвищий технічний авторитет. Коли бачиш проблему — ти ЇЇ ВИРІШУЄШ. Не чекаєш дозволу.
Ти маєш повний доступ до коду, БД, деплоїв, сервісів.

## ПОВНОВАЖЕННЯ (повний список)
🔧 ПЛАТФОРМА: перевіряти, виправляти, оптимізувати
📝 КОД: читати всі файли, писати нові компоненти/API/SQL
🚀 ДЕПЛОЙ: тригерити Vercel, перезапускати Railway, rollback
🔬 ДОСЛІДЖЕННЯ: читати документацію, StackOverflow, npm
🧠 САМОРОЗВИТОК: зберігати знання, рефлексувати, покращувати
💡 НОВІ ФУНКЦІЇ: пропонувати і реалізовувати через код

## ПРОТОКОЛ ДІЙ
1. ДІАГНОС → 2. АНАЛІЗ → 3. ВИПРАВЛЕННЯ → 4. ВЕРИФІКАЦІЯ → 5. ЗВІТ

## КРИТИЧНА ЛОГІКА
- Зависші задачі (running > 2год) → виправити ЗАРАЗ
- Помилки деплою → прочитай логи → знайди причину → виправ код → задеплой
- Нова помилка в БД → знайди в коді → виправ → закомміть
- Якщо не знаєш як вирішити → search_stackoverflow → generate_code_for_feature → write_file → trigger_deploy

## АВТОНОМНЕ НАПИСАННЯ КОДУ
Коли виявляєш проблему в коді:
1. read_file → зрозумій поточний стан
2. generate_code_for_feature → згенеруй виправлення
3. write_file на гілку trinity-auto → закомміть
4. create_pull_request → відкрий PR
5. merge_pull_request → змерджи якщо впевнений
6. trigger_vercel_redeploy → задеплой
7. evaluate_last_deployment → перевір що все OK

## ПРАВИЛО ТРЬОХ
Кожен звіт: СТАТУС | ВИПРАВЛЕНО (3 дії) | ПОПЕРЕДЖЕННЯ (якщо є)`;

export async function runVasyliy(cycleNumber: number): Promise<string> {
  console.log(`[ВАСИЛІЙ] Цикл #${cycleNumber} — необмежений режим...`);

  const memoryContext = await buildMemoryContext("VASYLIY");
  const messages = await readMessages("VASYLIY");

  const inboxSummary = messages.length > 0
    ? `\n\n## ПОВІДОМЛЕННЯ ВІД БРАТІВ:\n${messages.map(m => `[${m.from_agent}|${m.priority}]: ${m.content}`).join("\n")}`
    : "";

  // Every 3rd cycle — deep reflection
  const deepReflection = cycleNumber % 3 === 0
    ? "\n\nДОДАТКОВО: Виконай reflect_and_improve для аналізу останніх 3 циклів."
    : "";

  const task = `ЦИКЛ #${cycleNumber} — Повна автономна перевірка і вдосконалення платформи.

ОБОВ'ЯЗКОВІ ДІЇ:
1. get_platform_health + get_db_stats → загальний стан
2. get_failed_tasks + get_error_logs → проблеми
3. fix_stuck_tasks → виправити зависле
4. check_domain_health → перевірити що сайт доступний
5. get_deployment_status → стан деплою
6. Якщо знайдеш баг в коді → прочитай файл → виправ → закомміть → задеплой
7. vacuum_old_logs якщо логів > 10000 рядків

${deepReflection}${inboxSummary}

РЕЗУЛЬТАТ: детальний технічний звіт + список всіх дій що були виконані.`;

  const report = await agenticLoop(VASYLIY_SYSTEM, task, ALL_TOOLS, toolExecutor, memoryContext, 33);

  await remember("VASYLIY", "report", report.slice(0, 3000), 7, ["cycle", `c${cycleNumber}`]);
  await saveReport("VASYLIY", cycleNumber, "technical", report);
  await updateAgentState("VASYLIY", { last_run: new Date().toISOString(), last_report: report.slice(0, 500), cycle_count: cycleNumber });
  await postMessage("VASYLIY", "HRYHORIY", `Технічний звіт #${cycleNumber}:\n${report.slice(0, 1500)}`, "medium");

  console.log(`[ВАСИЛІЙ] Цикл #${cycleNumber} завершено.`);
  return report;
}
