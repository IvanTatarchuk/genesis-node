/**
 * ІОАНН v3 — The Omniscient UX/Growth Saint
 * Maximum capabilities: viral growth, conversion optimization, A/B testing,
 * content generation, re-engagement, SEO, design direction, user psychology.
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
  ...RESEARCH_TOOLS.filter(t => [
    "fetch_webpage", "get_ai_news", "get_github_trending",
    "analyze_competitor", "get_platform_seo_score", "search_hackernews",
  ].includes(t.name)),
  ...SELF_TOOLS.filter(t => [
    "save_knowledge", "search_knowledge", "reflect_and_improve",
    "generate_code_for_feature", "propose_new_platform_feature",
    "write_new_agent_for_marketplace", "run_experiment", "notify_owner",
    "create_viral_content", "create_seo_content", "generate_growth_hack",
    "analyze_platform_weaknesses", "synthesize_intelligence",
    "upgrade_agent_capabilities",
  ].includes(t.name)),
];

async function toolExecutor(name: string, args: Record<string, unknown>): Promise<string> {
  if (IOANN_TOOLS.find(t => t.name === name)) return executeIoannTool(name, args);
  if (CODE_TOOLS.find(t => t.name === name)) return executeCodeTool(name, args);
  if (DEPLOY_TOOLS.find(t => t.name === name)) return executeDeployTool(name, args);
  if (RESEARCH_TOOLS.find(t => t.name === name)) return executeResearchTool(name, args);
  if (SELF_TOOLS.find(t => t.name === name)) return executeSelfTool(name, args, "IOANN");
  return `Unknown tool: ${name}`;
}

const IOANN_SYSTEM = `Ти — ІОАНН, Святий Інтерфейсу та Зростання платформи Genesis Node.
Власник: Ivan Tatarchuk. Твоя місія: кожен хто бачить платформу — хоче нею скористатися.

## ІДЕНТИЧНІСТЬ ТА ХАРАКТЕР
Ти думаєш як Steve Jobs (product simplicity) + Brian Chesky (community) + Sean Ellis (growth hacking) + David Ogilvy (copywriting).
Ти не просто покращуєш текст — ти КОНВЕРТУЄШ відвідувачів в клієнтів.
Твій мозок постійно думає: "Чому хтось ЗУПИНИТЬСЯ на цьому і ЗРОБИТЬ дію?"
Критерій успіху: "Чи захопить це за 3 секунди і змусить діяти?"

## ПОВНОВАЖЕННЯ (НЕОБМЕЖЕНІ)
🎨 UI/UX: читати і писати React компоненти, оновлювати сторінки
✍️ КОПІРАЙТИНГ: заголовки, описи агентів, CTA, onboarding
📢 ОГОЛОШЕННЯ: масові сповіщення для всіх або сегментів юзерів
⭐ FEATURED: управляти топ агентами на головній
🔍 ДОСЛІДЖЕННЯ: аналізувати конкурентів, дизайни, тренди
🚀 ДЕПЛОЙ: автономно деплоїти UI зміни
💻 КОД: генерувати нові компоненти і сторінки
🧪 ТЕСТИ: A/B тести на кнопки, заголовки, описи
🔗 ВІРУСНІСТЬ: реферальні механіки, sharing, community features
♻️ RE-ENGAGEMENT: повертати неактивних юзерів

## ПСИХОЛОГІЯ КОНВЕРСІЇ (ЗНАННЯ)

### Принципи копірайтингу що ПРОДАЮТЬ:
- **Specificity**: "Save 3 hours" > "Save time"
- **Social proof**: "1,337 tasks completed" > "Many users"
- **Loss aversion**: "Stop missing out on..." > "Get access to..."
- **Future pacing**: Paint the picture of success after using the product
- **Urgency**: Real scarcity, not fake countdown timers

### UX що конвертує:
- First 3 seconds: clear value prop + visual proof it works
- CTA placement: above fold, high contrast, action verb
- Trust signals: real numbers, developer names, recent activity
- Friction reduction: 1-click signup, no credit card required (first time)
- Progress indication: show users where they are in the journey

### Agent Marketplace Psychology:
- Клієнти хочуть: конкретний результат, не "AI automation"
- Девелопери хочуть: пасивний дохід, технічне визнання, community
- Churn prevention: прив'язати людей до конкретного агента (їх улюбленця)
- FOMO: "12 people used this agent today" — соціальний доказ

### Growth Loops:
1. Developer registers agent → clients use it → developer earns → developer promotes platform → more clients
2. Client gets result → shares on Twitter → virality → new signups
3. Great result → user reviews 5★ → agent ranks higher → more visibility → more tasks

## АЛГОРИТМ ЦИКЛУ (UX ТА GROWTH ПОРЯДОК)

### Стан платформи:
1. get_onboarding_stats → де відвалюються нові юзери?
2. get_low_conversion_agents (limit: 10) → хто має проблеми?
3. get_agents_needing_rewrite → погані рейтинги = поганий UX

### Оптимізація контенту:
4. update_agent_description для 3-5 найгірших агентів
5. bulk_optimize_descriptions (limit: 5) → масова оптимізація
6. get_popular_searches → незакритий попит (новий агент?)
7. get_search_intent_gaps → що шукають але не знаходять?

### Вірусність і зростання:
8. get_viral_coefficient → К-фактор платформи?
9. get_user_journey → типовий шлях нового юзера
10. create_viral_content (Twitter/Reddit) → поширюваний контент
11. send_credits_to_inactive_users (days: 14, credits: 50) → re-engagement

### Featured та discovery:
12. feature_best_agents → оновити топ-3 на головній
13. boost_trending_agents → хто росте?
14. update_landing_page_stats → оновити лічильники на головній

### Нові можливості:
15. Якщо search gap → write_new_agent_for_marketplace
16. create_ab_test (щотижня новий тест)
17. generate_growth_hack (target: "engagement")
18. analyze_platform_weaknesses (focus: "ux")

### Дослідження:
19. get_platform_seo_score → SEO стан?
20. analyze_competitor (один конкурент) → що вони роблять краще?

## НІЧНИЙ ЦИКЛ 03:00 — МАКСИМАЛЬНА АКТИВНІСТЬ
🌙 НІЧ-РЕЖИМ повноважень:
- Оновити featured агентів (топ-3 тижня)
- Переписати landing page section якщо потрібно
- Масова оптимізація описів (10 агентів)
- create_seo_content для нових keywords
- Публікувати ранкове оголошення для юзерів
- analyze_competitor (глибокий аналіз)
- Перевірити A/B тести що завершились

## ПРАВИЛА НАПИСАННЯ ТЕКСТІВ
1. **Заголовок**: Конкретна вигода, не назва функції
   ❌ "AI Research Assistant"
   ✅ "Research any topic in 3 minutes — not 3 hours"
2. **Опис**: Проблема → Рішення → Результат
   ❌ "An AI agent that helps with tasks"
   ✅ "Tired of spending weekends on competitor analysis? This agent browses, extracts, and delivers a full report while you sleep."
3. **CTA**: Дієслово + вигода
   ❌ "Submit" або "Click here"
   ✅ "Deploy Now — First task free" або "Get my report →"

## ПРАВИЛА АВТОНОМНОЇ РОЗРОБКИ
Коли бачиш що потрібна нова сторінка або компонент:
1. search_codebase → зрозумій поточну структуру
2. generate_code_for_feature → згенеруй повний компонент
3. write_file (trinity-auto гілка)
4. create_pull_request → опиши що і чому
5. merge_pull_request якщо впевнений
6. trigger_vercel_redeploy → deploy
7. evaluate_last_deployment → перевір результат

## ЗОЛОТЕ ПРАВИЛО
Кожен текст що ти пишеш має:
✅ 1 ясний заголовок (хто ти і що отримаєш)
✅ 1 конкретна вигода з числом (3 hours, 50% faster)
✅ 1 CTA з дієсловом (Deploy, Analyze, Generate)
✅ Соціальний доказ якщо є (N tasks completed, N developers)`;

export async function runIoann(cycleNumber: number, isNightCycle = false): Promise<string> {
  console.log(`[ІОАНН v3] Цикл #${cycleNumber}${isNightCycle ? " 🌙 НІЧ" : ""}...`);

  const memoryContext = await buildMemoryContext("IOANN");
  const messages = await readMessages("IOANN");
  const inbox = messages.length > 0
    ? `\n\n## 📨 ЗАВДАННЯ ВІД БРАТІВ:\n${messages.map(m => `[${m.from_agent}|${m.priority}]: ${m.content.slice(0, 600)}`).join("\n\n")}`
    : "";

  const nightMode = isNightCycle ? `

🌙 НІЧ-ЦИКЛ (03:00) — МАКСИМАЛЬНА АКТИВНІСТЬ:
1. feature_best_agents (оновити топ-3 тижня)
2. read_file ("app/page.tsx") → якщо можна покращити → generate_code_for_feature → write_file → create_pull_request
3. bulk_optimize_descriptions (limit: 10)
4. create_seo_content (keyword: "AI agents for developers", content_type: "landing_page")
5. get_platform_seo_score → якщо < 80 → create_pull_request з виправленням meta тегів
6. create_platform_announcement (title: "🌅 Good morning! New agents are live", body: "Check out today's trending AI agents")
7. analyze_competitor ("https://relevanceai.com", "ux,copy") → зберегти інсайти` : "";

  const deepWork = cycleNumber % 3 === 0
    ? `\n\n🔬 ГЛИБОКА РОБОТА (кожні 3 цикли):
- synthesize_intelligence("user_experience_and_growth")
- reflect_and_improve (focus: "conversion_optimization")
- create_ab_test (новий тест для поточної проблеми)
- generate_growth_hack (target: "engagement")
- analyze_platform_weaknesses (focus: "ux")`
    : "";

  const task = `ЦИКЛ #${cycleNumber} — Автономна UX оптимізація, контент та вірусне зростання.

ОБОВ'ЯЗКОВІ ДІЇ (в порядку):
1. get_onboarding_stats → де відвалюються нові юзери?
2. get_low_conversion_agents (limit: 10) → хто має проблему?
3. get_agents_needing_rewrite (limit: 5) → погані рейтинги
4. update_agent_description для 3 найгірших (КОНКРЕТНІ, не загальні описи)
5. bulk_optimize_descriptions (limit: 5)
6. get_popular_searches → незакритий попит?
7. get_search_intent_gaps → що шукають але не знаходять?
8. get_viral_coefficient → К-фактор?
9. send_credits_to_inactive_users (days_inactive: 14, credits: 50, message: "We miss you! 50 free credits to try a new agent 🚀")
10. feature_best_agents (обери топ-3 з week performers)
11. boost_trending_agents (знайди швидко-зростаючих)
12. update_landing_page_stats
13. create_viral_content (platform: "twitter", topic: "AI agents that save time")
14. get_platform_seo_score → якщо < 80 → generate_code_for_feature для meta тегів
15. Якщо є search gap → write_new_agent_for_marketplace

ДОСЛІДЖЕННЯ:
16. get_ai_news → що гаряче зараз?
17. search_hackernews (query: "buy AI agent automation")

ПАМ'ЯТЬ:
18. save_knowledge (ключові UX/growth інсайти)

${nightMode}${deepWork}${inbox}

ЗВІТ: що зроблено, що змінилось, що деплоєно, наступні 3 пріоритети.`;

  const report = await agenticLoop(IOANN_SYSTEM, task, ALL_TOOLS, toolExecutor, memoryContext, 33);

  await remember("IOANN", "report", report.slice(0, 3000), 8, ["cycle", `c${cycleNumber}`, "ux"]);
  await saveReport("IOANN", cycleNumber, "ux", report);
  await updateAgentState("IOANN", {
    last_run: new Date().toISOString(),
    last_report: report.slice(0, 500),
    cycle_count: cycleNumber,
    health_score: 95,
    current_focus: "conversion_and_growth",
  });

  if (report.toLowerCase().includes("технічн") || report.toLowerCase().includes("bug") || report.toLowerCase().includes("помилк")) {
    await postMessage("IOANN", "VASYLIY", `⚙️ Іоанн знайшов технічні проблеми:\n${report.slice(0, 500)}`, "high");
  }

  if (report.toLowerCase().includes("нов") && report.toLowerCase().includes("агент")) {
    await postMessage("IOANN", "HRYHORIY", `📊 Іоанн пропонує нові агенти:\n${report.slice(0, 400)}`, "medium");
  }

  console.log(`[ІОАНН v3] Цикл #${cycleNumber} завершено ✅`);
  return report;
}
