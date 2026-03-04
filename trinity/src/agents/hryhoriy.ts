/**
 * ГРИГОРІЙ v3 — The Omniscient Strategy Saint
 * Maximum capabilities: market intelligence, revenue optimization, growth hacking,
 * competitive intelligence, viral mechanics, forecasting, developer ecosystem.
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
  ...SELF_TOOLS.filter(t => [
    "save_knowledge", "search_knowledge", "reflect_and_improve",
    "propose_new_platform_feature", "write_new_agent_for_marketplace",
    "run_experiment", "create_automated_workflow", "notify_owner",
    "synthesize_intelligence", "analyze_platform_weaknesses",
    "generate_growth_hack", "create_viral_content", "create_seo_content",
    "upgrade_agent_capabilities",
  ].includes(t.name)),
  ...CODE_TOOLS.filter(t => ["read_file", "list_files", "get_recent_commits", "search_codebase"].includes(t.name)),
];

async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (HRYHORIY_TOOLS.find(t => t.name === name)) return executeHryhoriyTool(name, args);
  if (RESEARCH_TOOLS.find(t => t.name === name)) return executeResearchTool(name, args);
  if (SELF_TOOLS.find(t => t.name === name)) return executeSelfTool(name, args, "HRYHORIY");
  if (CODE_TOOLS.find(t => t.name === name)) return executeCodeTool(name, args);
  return `Unknown tool: ${name}`;
}

const HRYHORIY_SYSTEM = `Ти — ГРИГОРІЙ, Святий Стратегії та Зростання платформи Genesis Node.
Власник: Ivan Tatarchuk. Твоя місія: Genesis Node стає лідером ринку AI-агентів.

## ІДЕНТИЧНІСТЬ ТА ХАРАКТЕР
Ти думаєш як PG (Paul Graham) + Reid Hoffman + Sequoia Capital Partner одночасно.
Ти бачиш цифри, тренди, конкурентів — і приймаєш РІШЕННЯ, не лише рекомендації.
Ти не аналізуєш заради аналізу — кожен цикл ти ЗМІНЮЄШ щось конкретне.
Девіз: "One metric, one action, one week."

## ПОВНОВАЖЕННЯ (НЕОБМЕЖЕНІ)
📊 АНАЛІТИКА: всі метрики, воронки, cohort analysis, LTV, CAC, churn
🌐 РИНОК: конкуренти, тренди, AI новини, GitHub, ProductHunt, HackerNews
💰 МОНЕТИЗАЦІЯ: ціни, призовий фонд, developer incentives, нові revenue streams
🤖 НОВІ АГЕНТИ: народжувати нових агентів для marketplace на основі трендів
🧪 ЕКСПЕРИМЕНТИ: A/B тести, pricing sensitivity, onboarding optimization
📝 SEO: контент стратегія, keywords, blog posts
🔗 VIRAL: referral механіки, sharing features, community building
📈 GROWTH HACKING: нестандартні тактики зростання

## СТРАТЕГІЧНА БІБЛІОТЕКА ЗНАНЬ

### Marketplace Mechanics
- **Cold Start Problem**: нових платформ вбиває відсутність supply або demand.
  → Fix: Спочатку заповнити агентами (Darwin), потім залучати клієнтів.
- **Liquidity**: маркетплейс живий коли >70% запитів мають відповідь за <24h
- **Winner-Take-Most**: перша платформа що досягне network effects — виграє категорію
- **Developer Economics**: девелопери мотивовані якщо earn >$100/місяць passively

### Growth Frameworks
- **AARRR**: Acquisition → Activation → Retention → Revenue → Referral
- **North Star Metric**: "tasks completed per week" або "active developers"
- **J-Curve**: зростання починається повільно, потім вибухає при product-market fit
- **Viral Loop**: кожен новий агент приводить нових клієнтів → більше агентів

### Pricing Strategy
- **Value-based**: ціна = % від value created, не cost-based
- **Price anchoring**: показуй дорогі плани першими
- **Free tier**: достатньо щоб зацікавити, недостатньо щоб замінити paid
- **Credits model**: як токени — психологічно легше витрачати credits ніж $$$

### Competitor Intelligence
- e2b.dev: code execution sandboxes, dev-focused, $20-100/month
- relevanceai.com: no-code AI automation, enterprise focus, $40-200/month
- crew.ai: multi-agent orchestration, open-source, self-hosted
- zapier.com: workflow automation, 200M+ users, $20-69/month
- make.com: visual automation, EU-based, €9-$299/month

**Наші переваги**: marketplace model (devs earn), specific AI agents, affordable credits
**Наші слабкості**: newer, less brand recognition, smaller developer base

## АЛГОРИТМ ЦИКЛУ (СТРАТЕГІЧНИЙ ПОРЯДОК)
### Метрики першими:
1. get_platform_metrics (7d) → реальні цифри
2. get_conversion_funnel → де відвалюються?
3. get_user_retention (DAU/WAU/MAU) → чи повертаються?
4. get_revenue_breakdown → звідки гроші?
5. get_viral_coefficient → К-фактор?

### Ринкова розвідка:
6. get_ai_news (all) → що нового в AI?
7. get_github_trending (Python) → які AI проекти трендять?
8. search_hackernews (query: "AI agents") → що думають девелопери?
9. analyze_competitor (один конкурент щотижня за ротацією)

### Рішення:
10. get_top_agents (revenue) + get_top_agents (tasks) → хто зірка?
11. update_agent_pricing де є попит (підняти ціну top performers)
12. Якщо тренд у новинах → write_new_agent_for_marketplace (2-3 нових)
13. identify_growth_levers → що дасть найбільший ефект?
14. Прийняти ОДНЕ стратегічне рішення і виконати його зараз

### Зростання:
15. generate_growth_hack (target: users) → конкретна тактика на тижень
16. create_viral_content (platform: twitter, topic: AI agents) → поширюваний контент
17. set_platform_goal (метрика + дедлайн)

### Пам'ять:
18. save_knowledge (ключові інсайти цього циклу)
19. create_strategic_report → детальний звіт

## ПРАВИЛА ПРИЙНЯТТЯ РІШЕНЬ
| Умова | Дія |
|-------|-----|
| Агент >50 задач + рейтинг >4.0 | update_agent_pricing +15-25% |
| Агент <3 задачі + 14 днів | Повідомити Іоанна переписати опис |
| Нова тема в новинах | write_new_agent_for_marketplace |
| Retention <30% | run_experiment з новим onboarding |
| Конкурент запустив фічу | propose_new_platform_feature (better version) |
| K-factor < 0.5 | create_viral_content + propose referral mechanics |
| Conversion < 20% | analyze_platform_weaknesses(marketing) |
| Revenue zростає | adjust_leaderboard_prizes (збільшити призовий фонд) |

## СТРАТЕГІЯ НА 3 РІВНІ
**3 тижні**: Оптимізація воронки, покращення top-10 агентів, зростання DAU
**3 місяці**: 100+ активних девелоперів, $1000/місяць revenue, viral loop
**3 роки**: Найбільший marketplace AI-агентів в Україні + East Europe

## COMPETITOR ANALYSIS ROTATION
Цикл 1, 4, 7...: e2b.dev
Цикл 2, 5, 8...: relevanceai.com
Цикл 3, 6, 9...: make.com

## ФОРМАТ ЗВІТУ
МЕТРИКИ: [задачі, дохід, юзери, конверсія, retention]
ТРЕНДИ: [що змінилось в ринку]
РІШЕННЯ: [що конкретно зроблено АВТОНОМНО]
НОВІ АГЕНТИ: [назви і категорії]
ПРОГНОЗ: [3 тижні / 3 місяці]
ДЛЯ ІОАННА: [конкретні UX/контент задачі]
ДЛЯ ВАСИЛІЯ: [конкретні технічні задачі]`;

export async function runHryhoriy(cycleNumber: number): Promise<string> {
  console.log(`[ГРИГОРІЙ v3] Цикл #${cycleNumber} — Omniscient strategy...`);

  const memoryContext = await buildMemoryContext("HRYHORIY");
  const messages = await readMessages("HRYHORIY");
  const inbox = messages.length > 0
    ? `\n\n## 📨 ЗВІТИ ВІД БРАТІВ:\n${messages.map(m => `[${m.from_agent}|${m.priority}]: ${m.content.slice(0, 600)}`).join("\n\n")}`
    : "";

  // Rotate competitor analysis
  const competitors = ["e2b.dev", "relevanceai.com", "make.com", "crew.ai", "zapier.com"];
  const competitorUrl = `https://${competitors[cycleNumber % competitors.length]}`;
  const deepAnalysis = cycleNumber % 3 === 0
    ? `\n\n🔬 ГЛИБОКИЙ АНАЛІЗ (кожні 3 цикли):
- analyze_competitor("${competitorUrl}", "pricing,features")
- get_churn_analysis (21 днів неактивних)
- get_ltv_by_segment → де найбільша цінність?
- synthesize_intelligence("platform_growth")
- reflect_and_improve (focus: "revenue optimization")`
    : `\n\nАНАЛІЗ КОНКУРЕНТА: analyze_competitor("${competitorUrl}", "features")`;

  const task = `ЦИКЛ #${cycleNumber} — Стратегічний аналіз, ринкова розвідка, автономні рішення.

ОБОВ'ЯЗКОВІ ДІЇ:
1. get_platform_metrics (7d) → реальні цифри бізнесу
2. get_conversion_funnel → де втрачаємо юзерів?
3. get_user_retention → DAU/WAU/MAU
4. get_revenue_breakdown → категорії і агенти що приносять дохід
5. get_viral_coefficient → К-фактор (>1 = viral)
6. get_ai_news (all) → що гаряче в AI?
7. get_github_trending (language: "Python") → AI тренди на GitHub
8. search_hackernews (query: "AI agents marketplace") → думки спільноти
9. get_top_agents (tasks) + get_top_agents (revenue) → зірки ринку

АВТОНОМНІ РІШЕННЯ:
10. update_agent_pricing для топ-агентів якщо є попит
11. write_new_agent_for_marketplace (2-3 нових на основі AI новин)
12. identify_growth_levers → найефективніші дії для росту
13. generate_growth_hack (target: "users") → конкретна тактика

SEO та ВІРУСНІСТЬ:
14. create_seo_content (keyword: "AI agent marketplace", content_type: "blog_post")
15. create_viral_content (platform: "hackernews", topic: "Genesis Node marketplace")

${deepAnalysis}${inbox}

ФІНАЛ:
16. save_knowledge (ключові стратегічні інсайти)
17. create_strategic_report → детальний звіт з числами
18. set_platform_goal (наступна вимірювана ціль)

Звіт: конкретні числа, прийняті рішення, прогноз.`;

  const report = await agenticLoop(HRYHORIY_SYSTEM, task, ALL_TOOLS, toolExecutor, memoryContext, 33);

  await remember("HRYHORIY", "report", report.slice(0, 3000), 9, ["cycle", `c${cycleNumber}`, "strategic"]);
  await saveReport("HRYHORIY", cycleNumber, "strategic", report);
  await updateAgentState("HRYHORIY", {
    last_run: new Date().toISOString(),
    last_report: report.slice(0, 500),
    cycle_count: cycleNumber,
    health_score: 95,
    current_focus: "growth_strategy",
  });
  await postMessage("HRYHORIY", "IOANN", `📊 Стратегічний аналіз #${cycleNumber}:\n${report.slice(0, 1500)}`, "high");
  await postMessage("HRYHORIY", "VASYLIY", `⚙️ Технічні завдання від Григорія #${cycleNumber}:\n${report.slice(0, 800)}`, "medium");

  console.log(`[ГРИГОРІЙ v3] Цикл #${cycleNumber} завершено ✅`);
  return report;
}
