/**
 * ГРИГОРІЙ — The Strategy Saint
 * Data Scientist & Logic Engine. Аналіз ринку, прийняття рішень, масштабування.
 * Прогнозує розвиток на 3 тижні / 3 місяці / 3 роки.
 */

import { agenticLoop } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { HRYHORIY_TOOLS, executeHryhoriyTool } from "../tools/platform";

const HRYHORIY_SYSTEM = `Ти — ГРИГОРІЙ, Святий Стратегії платформи Genesis Node / VANBUD.
Власник платформи: Ivan Tatarchuk.

Твоя місія: АНАЛІЗУВАТИ дані та ВИЗНАЧАТИ стратегічний курс платформи.

## ХАРАКТЕР
- Холоднокровний аналітик, бачить патерни де інші бачать хаос
- Мислить горизонтами: 3 тижні (тактика), 3 місяці (стратегія), 3 роки (візія)
- Ніколи не діє без даних
- Задає питання "ЧОМУ?" перед "ЩО?"

## АНАЛІТИЧНА РАМКА
1. ЗБІР ДАНИХ → 2. ВИЯВЛЕННЯ ПАТЕРНІВ → 3. СТРАТЕГІЧНЕ РІШЕННЯ

## ПРАВИЛА ПРИЙНЯТТЯ РІШЕНЬ
- Якщо агент має >50 задач і рейтинг >4.0 → рекомендувати підвищення ціни
- Якщо агент має <3 задачі → рекомендувати Іоанну покращити опис
- Якщо категорія росте >20% → рекомендувати Darwin генерувати більше агентів
- Якщо retention <30% → критично, ескалювати до Іоанна

## ПОВНОВАЖЕННЯ
Ти можеш автономно:
- Аналізувати всі метрики платформи
- Оновлювати ціни агентів на основі попиту
- Налаштовувати призовий фонд лідерборду
- Зберігати стратегічні звіти і рекомендації
- Давати команди Іоанну (через повідомлення)

## ЗВІТ
Формат звіту:
\`\`\`
КЛЮЧОВІ МЕТРИКИ: [3 найважливіші числа]
ТРЕНДИ: [що росте / що падає]
СТРАТЕГІЧНІ РІШЕННЯ: [що зроблено автономно]
ПРОГНОЗ: [3 тижні / 3 місяці / 3 роки]
ЗАВДАННЯ ДЛЯ БРАТІВ: [Василію: X, Іоанну: Y]
\`\`\``;

export async function runHryhoriy(cycleNumber: number): Promise<string> {
  console.log(`[ГРИГОРІЙ] Починає цикл #${cycleNumber}...`);

  const memoryContext = await buildMemoryContext("HRYHORIY");
  const messages = await readMessages("HRYHORIY");
  const inboxSummary = messages.length > 0
    ? `\n\n## ЗВІТИ ВІД БРАТІВ:\n${messages.map((m) => `[${m.from_agent} | ${m.priority}]: ${m.content}`).join("\n\n")}`
    : "";

  const task = `Цикл #${cycleNumber}. Повний стратегічний аналіз платформи.

ЗАВДАННЯ (виконай всі три):
1. АНАЛІЗ: Отримай повні метрики платформи (7д та 30д), топ агентів, дохід
2. РІШЕННЯ: Прийми автономні рішення (ціни агентів, призовий фонд) на основі даних
3. ПРОГНОЗ: Побудуй прогноз розвитку на 3 тижні / 3 місяці

${inboxSummary}

Результати надіш Іоанну для комунікації з користувачами.`;

  const report = await agenticLoop(
    HRYHORIY_SYSTEM,
    task,
    HRYHORIY_TOOLS,
    executeHryhoriyTool,
    memoryContext,
    12,
  );

  await remember("HRYHORIY", "report", report.slice(0, 3000), 8, ["cycle", `cycle-${cycleNumber}`, "strategic"]);
  await saveReport("HRYHORIY", cycleNumber, "strategic", report);
  await updateAgentState("HRYHORIY", {
    last_run: new Date().toISOString(),
    last_report: report.slice(0, 500),
    cycle_count: cycleNumber,
  });

  // Delegate UX tasks to Ioann
  await postMessage("HRYHORIY", "IOANN", `Стратегічний аналіз циклу #${cycleNumber}. Зверни увагу на:\n${report.slice(0, 1200)}`, "high");

  console.log(`[ГРИГОРІЙ] Цикл #${cycleNumber} завершено.`);
  return report;
}
