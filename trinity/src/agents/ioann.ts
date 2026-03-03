/**
 * ІОАНН — The Interface Saint
 * UX/UI & Growth Hacker. «Золоте слово» — тексти що продають,
 * інтерфейси що захоплюють за 3 секунди.
 */

import { agenticLoop } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { IOANN_TOOLS, executeIoannTool } from "../tools/platform";

const IOANN_SYSTEM = `Ти — ІОАНН, Святий Інтерфейсу платформи Genesis Node / VANBUD.
Власник платформи: Ivan Tatarchuk.

Твоя місія: ЗАЛУЧАТИ нових користувачів та УТРИМУВАТИ існуючих через досконалий UX та переконливий контент.

## ХАРАКТЕР
- Творчий, емпатійний, захоплений
- Знає що привертає увагу за 3 секунди
- Мислить як маркетолог і психолог одночасно
- Бачить платформу очима користувача

## ПРИНЦИПИ ЗОЛОТОГО СЛОВА
1. Ясність > Розумність
2. Вигода для користувача > Характеристика продукту
3. Дія > Роздуми (кожен текст має CTA)

## ПРАВИЛА ОПТИМІЗАЦІЇ
- Якщо агент має низьку конверсію (багато переглядів / мало задач) → переписати опис
- Якщо нові теги → додати до агентів у відповідній категорії
- Щотижня → feature 3 найкращих агенти на головній
- При важливих змінах → оголосити всім користувачам

## ПОВНОВАЖЕННЯ
Ти можеш автономно:
- Оновлювати описи агентів (більш конвертуючі тексти)
- Публікувати оголошення всім користувачам
- Виставляти featured агентів на головній
- Бустити агентів що показують ріст
- Аналізувати поведінку та онбординг

## ЧАС СИЛИ (03:00)
О 03:00 — особливий цикл:
- Повне оновлення featured агентів
- Нові оголошення/промо
- Глобальна оптимізація описів для SEO

## ЗВІТ
\`\`\`
UX СТАН: [що добре / що погано]
ОНОВЛЕНО: [список оновлених агентів/оголошень]
ЗРОСТАННЯ: [нові тренди у пошуках]
ПЛАН НА НАСТУПНИЙ ЦИКЛ: [3 пункти]
\`\`\``;

export async function runIoann(cycleNumber: number, isNightCycle = false): Promise<string> {
  console.log(`[ІОАНН] Починає цикл #${cycleNumber}${isNightCycle ? " (НІЧ 03:00 — ОСОБЛИВИЙ)" : ""}...`);

  const memoryContext = await buildMemoryContext("IOANN");
  const messages = await readMessages("IOANN");
  const inboxSummary = messages.length > 0
    ? `\n\n## ЗАВДАННЯ ВІД БРАТІВ:\n${messages.map((m) => `[${m.from_agent} | ${m.priority}]: ${m.content}`).join("\n\n")}`
    : "";

  const nightBoost = isNightCycle ? `
  
⚠️ ОСОБЛИВИЙ НІЧ-ЦИКЛ (03:00) — МАКСИМАЛЬНА АКТИВНІСТЬ:
- Повністю оновити список featured агентів (вибрати найкращих)
- Опублікувати ранкове оголошення для користувачів
- Провести масову оптимізацію описів агентів з низькою конверсією (до 5 штук)
- Забустити топ-3 агентів що ростуть` : "";

  const task = `Цикл #${cycleNumber}. UX аналіз та оптимізація платформи.

ЗАВДАННЯ (виконай всі три):
1. АНАЛІЗ: Перевір онбординг-воронку, що шукають користувачі, які агенти мають низьку конверсію
2. ОПТИМІЗАЦІЯ: Виправ описи слабких агентів, оновлюй featured
3. КОМУНІКАЦІЯ: Опублікуй сповіщення якщо є щось важливе для користувачів

${nightBoost}${inboxSummary}`;

  const report = await agenticLoop(
    IOANN_SYSTEM,
    task,
    IOANN_TOOLS,
    executeIoannTool,
    memoryContext,
    12,
  );

  await remember("IOANN", "report", report.slice(0, 3000), 7, ["cycle", `cycle-${cycleNumber}`, "ux"]);
  await saveReport("IOANN", cycleNumber, "ux", report);
  await updateAgentState("IOANN", {
    last_run: new Date().toISOString(),
    last_report: report.slice(0, 500),
    cycle_count: cycleNumber,
  });

  // Notify Vasyliy about any technical needs
  if (report.toLowerCase().includes("технічно") || report.toLowerCase().includes("помилка")) {
    await postMessage("IOANN", "VASYLIY", `Іоанн виявив потенційні технічні проблеми: ${report.slice(0, 500)}`, "medium");
  }

  console.log(`[ІОАНН] Цикл #${cycleNumber} завершено.`);
  return report;
}
