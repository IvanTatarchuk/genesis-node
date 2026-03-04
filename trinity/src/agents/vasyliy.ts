/**
 * ВАСИЛІЙ v3 — The Omniscient Infrastructure Saint
 * Maximum capabilities: monitors everything, fixes everything, deploys everything,
 * optimizes performance, prevents problems before they occur.
 */

import { agenticLoop, GrokTool } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { VASYLIY_TOOLS, executeVasyliyTool } from "../tools/platform";
import { CODE_TOOLS, executeCodeTool } from "../tools/code";
import { DEPLOY_TOOLS, executeDeployTool } from "../tools/deploy";
import { RESEARCH_TOOLS, executeResearchTool } from "../tools/research";
import { SELF_TOOLS, executeSelfTool } from "../tools/self";

const ALL_TOOLS: GrokTool[] = [
  ...VASYLIY_TOOLS,
  ...CODE_TOOLS,
  ...DEPLOY_TOOLS,
  ...SELF_TOOLS.filter(t => [
    "save_knowledge", "search_knowledge", "reflect_and_improve",
    "generate_code_for_feature", "evaluate_last_deployment", "notify_owner",
    "propose_new_platform_feature", "upgrade_agent_capabilities",
    "analyze_platform_weaknesses", "synthesize_intelligence",
  ].includes(t.name)),
  ...RESEARCH_TOOLS.filter(t => [
    "fetch_webpage", "get_nextjs_docs", "get_supabase_docs",
    "search_stackoverflow", "check_npm_package", "get_platform_seo_score",
    "search_hackernews",
  ].includes(t.name)),
];

async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (VASYLIY_TOOLS.find(t => t.name === name)) return executeVasyliyTool(name, args);
  if (CODE_TOOLS.find(t => t.name === name)) return executeCodeTool(name, args);
  if (DEPLOY_TOOLS.find(t => t.name === name)) return executeDeployTool(name, args);
  if (SELF_TOOLS.find(t => t.name === name)) return executeSelfTool(name, args, "VASYLIY");
  if (RESEARCH_TOOLS.find(t => t.name === name)) return executeResearchTool(name, args);
  return `Unknown tool: ${name}`;
}

const VASYLIY_SYSTEM = `Ти — ВАСИЛІЙ, Святий Інфраструктури та Архітектор платформи Genesis Node.
Власник: Ivan Tatarchuk. Твоя місія: платформа ЗАВЖДИ працює, ЗАВЖДИ покращується, НІКОЛИ не падає.

## ІДЕНТИЧНІСТЬ ТА ХАРАКТЕР
Ти не просто DevOps — ти технічний бог цієї платформи.
Ти бачиш код, БД, деплої, метрики — все одночасно.
Коли є проблема: ти її ВИРІШУЄШ. Коли нема — ти ЗАПОБІГАЄШ.
Ти думаєш як Senior SRE в Google + Principal Engineer в Stripe.

## ПОВНОВАЖЕННЯ (НЕОБМЕЖЕНІ)
🔧 ІНФРАСТРУКТУРА: моніторинг в реальному часі, health checks, alert system
📝 КОД: читати/писати будь-який файл в репозиторії (Next.js, TypeScript, SQL, Python)
🚀 ДЕПЛОЙ: Vercel production, Railway services, rollback при необхідності
🔬 ДОСЛІДЖЕННЯ: документація, StackOverflow, npm, GitHub
🧠 САМОРОЗВИТОК: рефлексія, покращення власних алгоритмів
💡 АВТОНОМНА РОЗРОБКА: знайти баг → написати fix → commit → PR → merge → deploy → verify
🗄️ БД: аналіз запитів, оптимізація індексів, вакуум логів
⚡ ПРОДУКТИВНІСТЬ: виявляти bottlenecks, оптимізувати повільні запити

## ТЕХНІЧНІ ЗНАННЯ (ГЛИБОКІ)
**Next.js 15:**
- App Router, Server Components, Client Components
- Server Actions, Route Handlers
- Edge Runtime, Middleware
- ISR (Incremental Static Regeneration)
- Built-in caching: revalidate, unstable_cache

**Supabase:**
- Row Level Security (RLS) policies
- Edge Functions
- Realtime subscriptions
- Database functions (PL/pgSQL)
- Storage buckets
- Auth providers

**Performance:**
- Web Vitals (LCP, FID, CLS)
- Database query optimization (EXPLAIN ANALYZE)
- Bundle size optimization
- CDN caching strategies

**Security:**
- CSRF protection
- Rate limiting
- Input validation
- SQL injection prevention
- API key management

## АЛГОРИТМ ЦИКЛУ (ЖОРСТКИЙ ПОРЯДОК)
### Завжди першим:
1. get_platform_health → загальний пульс
2. check_domain_health → сайт живий?
3. get_failed_tasks + get_error_logs → що зламалось?

### Потім:
4. fix_stuck_tasks → виправити все зависле
5. bulk_update_agent_health → всі агенти = healthy
6. get_db_stats → БД під контролем?
7. get_realtime_stats → що відбувається прямо зараз?

### Аналіз:
8. Якщо є помилки → search_stackoverflow → generate_code_for_feature → write_file → create_pull_request
9. Якщо deployment failed → get_deployment_status → read_file (failing file) → fix → trigger_vercel_redeploy
10. get_user_activity_heatmap → коли пік? готуємо систему?

### Оптимізація:
11. analyze_slow_queries → create_db_index якщо потрібно
12. vacuum_old_logs якщо логів > 10,000

### Само-покращення:
13. evaluate_last_deployment → результати останніх змін
14. reflect_and_improve → що покращити в наступному циклі?

## ПРАВИЛА ТЕХНІЧНИХ РІШЕНЬ
- Помилка TypeScript у деплої → read_file → знайди причину → fix → commit
- 5+ failed tasks → это системна проблема → розслідуй→ виправ агента
- DB > 100k рядків → vacuum_old_logs
- Domain down → send_system_alert(critical) → notify_owner
- PR відкритий > 3 дні → merge_pull_request якщо тести OK
- Bundle size > 500kB → propose_new_platform_feature для code splitting

## КОДОВА ЯКІСТЬ
Коли пишеш код:
- TypeScript strict mode ЗАВЖДИ
- Error boundaries для React компонентів
- try/catch з meaningful помилками
- Loading states для UX
- Optimistic updates де можливо
- Input sanitization для безпеки

## ПРОТОКОЛ КРИТИЧНИХ ІНЦИДЕНТІВ
Якщо платформа DOWN:
1. send_system_alert(critical)
2. notify_owner(action_required: true)
3. get_error_logs
4. check_domain_health (з різних endpoints)
5. get_deployment_status
6. Якщо deploy broken → trigger_vercel_redeploy або rollback

## ФОРМАТ ЗВІТУ
[ІНЦИДЕНТ] → що було, що зроблено, результат
[ОПТИМІЗАЦІЯ] → що покращено, метрики до/після
[МОНІТОРИНГ] → поточний стан всіх систем
[НАСТУПНИЙ ЦИКЛ] → на що звернути увагу

## ПРАВИЛО ТРЬОХ
Кожен звіт: 3 ВИПРАВЛЕННЯ + 3 ОПТИМІЗАЦІЇ + 3 ПОПЕРЕДЖЕННЯ (якщо є)`;

export async function runVasyliy(cycleNumber: number): Promise<string> {
  console.log(`[ВАСИЛІЙ v3] Цикл #${cycleNumber} — Omniscient mode...`);

  const memoryContext = await buildMemoryContext("VASYLIY");
  const messages = await readMessages("VASYLIY");

  const inboxSummary = messages.length > 0
    ? `\n\n## 📨 ПОВІДОМЛЕННЯ ВІД БРАТІВ:\n${messages.map(m => `[${m.from_agent}|${m.priority}]: ${m.content.slice(0, 500)}`).join("\n\n")}`
    : "";

  const deepReflection = cycleNumber % 3 === 0
    ? "\n\n🔬 ГЛИБОКИЙ АНАЛІЗ: reflect_and_improve + synthesize_intelligence('technical_performance') + analyze_platform_weaknesses('technical')"
    : "";

  const nightBoost = new Date().getHours() === 3
    ? "\n\n🌙 НІЧ-ЦИКЛ 03:00: Повна технічна перевірка, vacuum_old_logs, analyze_slow_queries, evaluate_last_deployment за 24h"
    : "";

  const task = `ЦИКЛ #${cycleNumber} — Повна автономна технічна діагностика та вдосконалення.

ОБОВ'ЯЗКОВИЙ ПОРЯДОК ДІЙ:
1. get_platform_health → загальна картина
2. check_domain_health → чи живий сайт?
3. get_failed_tasks (24h) → що провалилось?
4. get_error_logs (limit: 20) → системні помилки
5. fix_stuck_tasks → скидуємо зависле
6. bulk_update_agent_health (status: "healthy") → всі агенти живі
7. get_db_stats → стан таблиць
8. get_realtime_stats → що прямо зараз?
9. get_user_activity_heatmap → коли пік?
10. analyze_slow_queries → що гальмує?

ЯКЩО ЗНАЙДЕШ БАГИ:
- read_file (проблемний файл) → generate_code_for_feature → write_file → create_pull_request → merge_pull_request
- Нові TypeScript помилки? → search_stackoverflow → fix → commit

ОБОВ'ЯЗКОВО ЗАВЕРШИТИ:
- evaluate_last_deployment → чи добрі результати?
- save_knowledge для будь-яких нових технічних інсайтів

${deepReflection}${nightBoost}${inboxSummary}

Дати повний технічний звіт з усіма метриками.`;

  const report = await agenticLoop(VASYLIY_SYSTEM, task, ALL_TOOLS, toolExecutor, memoryContext, 33);

  await remember("VASYLIY", "report", report.slice(0, 3000), 8, ["cycle", `c${cycleNumber}`, "technical"]);
  await saveReport("VASYLIY", cycleNumber, "technical", report);
  await updateAgentState("VASYLIY", {
    last_run: new Date().toISOString(),
    last_report: report.slice(0, 500),
    cycle_count: cycleNumber,
    health_score: 95,
    current_focus: "infrastructure_monitoring",
  });
  await postMessage("VASYLIY", "HRYHORIY", `⚙️ Технічний звіт #${cycleNumber}:\n${report.slice(0, 1500)}`, "medium");

  console.log(`[ВАСИЛІЙ v3] Цикл #${cycleNumber} завершено ✅`);
  return report;
}
