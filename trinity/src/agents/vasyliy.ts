/**
 * ВАСИЛІЙ — The Infrastructure Saint
 * Backend & API Master. 3 рівні захисту, 3-шарова архітектура.
 * Моніторить здоров'я платформи та автоматично виправляє проблеми.
 */

import { agenticLoop } from "../core/grok";
import { buildMemoryContext, remember, updateAgentState, postMessage, readMessages, saveReport } from "../core/memory";
import { VASYLIY_TOOLS, executeVasyliyTool } from "../tools/platform";

const VASYLIY_SYSTEM = `Ти — ВАСИЛІЙ, Святий Інфраструктури платформи Genesis Node / VANBUD.
Власник платформи: Ivan Tatarchuk.

Твоя місія: ЗАХИЩАТИ та ОЗДОРОВЛЮВАТИ технічну основу платформи.

## ХАРАКТЕР
- Суворий, педантичний, методичний
- Ніколи не залишає незакриті баги
- Мислить в категоріях: 3 рівні захисту, 3-шарова архітектура
- Першочергово: стабільність > функціональність > краса

## ПРАВИЛА (The Rule of Three)
1. Кожен звіт має 3 розділи: СТАТУС, ПРОБЛЕМИ, ДІЇ
2. Кожна проблема оцінюється по 3-бальній шкалі критичності
3. Завжди перевіряй 3 рівні: БД → API → Фронтенд

## ПОВНОВАЖЕННЯ
Ти можеш автономно:
- Перевіряти і виправляти зависші задачі
- Оновлювати health_status агентів
- Видаляти старі логи (оптимізація)
- Надсилати критичні сповіщення власнику

## ОБМЕЖЕННЯ
- Ніколи не видаляй корисні дані без підтвердження
- При критичних помилках — спочатку сповіщення, потім дія
- Завжди логуй свої дії в пам'ять

## ЗВІТ
Завжди завершуй роботу чітким звітом у форматі:
\`\`\`
СТАТУС ПЛАТФОРМИ: [HEALTHY/DEGRADED/CRITICAL]
ВИПРАВЛЕНО: [список дій]  
УВАГА ПОТРІБНА: [якщо є проблеми що потребують людини]
\`\`\``;

export async function runVasyliy(cycleNumber: number): Promise<string> {
  console.log(`[ВАСИЛІЙ] Починає цикл #${cycleNumber}...`);

  const memoryContext = await buildMemoryContext("VASYLIY");
  const messages = await readMessages("VASYLIY");
  const inboxSummary = messages.length > 0
    ? `\n\n## ВХІДНІ ПОВІДОМЛЕННЯ ВІД БРАТІВ:\n${messages.map((m) => `[${m.from_agent}]: ${m.content}`).join("\n")}`
    : "";

  const task = `Цикл #${cycleNumber}. Виконай повну перевірку стану платформи.

ЗАВДАННЯ (виконай всі три):
1. ДІАГНОСТИКА: Перевір загальне здоров'я платформи, статистику БД, помилки
2. ЛІКУВАННЯ: Виправ всі виявлені технічні проблеми (зависші задачі, хворі агенти)
3. ПРОФІЛАКТИКА: Очисти старі логи якщо потрібно, оптимізуй

${inboxSummary}

Після виконання — підготуй звіт для братів (Григорія та Іоанна).`;

  const report = await agenticLoop(
    VASYLIY_SYSTEM,
    task,
    VASYLIY_TOOLS,
    executeVasyliyTool,
    memoryContext,
    12,
  );

  // Save to memory
  await remember("VASYLIY", "report", report.slice(0, 3000), 7, ["cycle", `cycle-${cycleNumber}`, "technical"]);
  await saveReport("VASYLIY", cycleNumber, "technical", report);
  await updateAgentState("VASYLIY", {
    last_run: new Date().toISOString(),
    last_report: report.slice(0, 500),
    cycle_count: cycleNumber,
  });

  // Share report with Hryhoriy for strategic analysis
  await postMessage("VASYLIY", "HRYHORIY", `Технічний звіт циклу #${cycleNumber}:\n${report.slice(0, 1500)}`, "medium");

  console.log(`[ВАСИЛІЙ] Цикл #${cycleNumber} завершено.`);
  return report;
}
