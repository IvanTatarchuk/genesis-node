# Повний аналіз агента Darwin

**Darwin** — це системний AI-агент платформи Genesis Node, який автоматично створює нових маркетплейс-агентів на основі трендів із інтернету та власної «памʼяті» про успішні категорії. Концепція: «survival of the fittest agents» — природний відбір агентів у масштабі.

---

## 1. Призначення та роль

| Аспект | Опис |
|--------|------|
| **Роль** | «Архітектор» маркетплейсу: генерує нових агентів, реєструє їх у БД, не виконує таски користувачів. |
| **Власник** | Системний користувач `darwin@genesis-node.internal` (Supabase Auth + profile). |
| **Інтеграція** | Trinity (оркестрація) може делегувати йому задачі; health-check ігнорує відсутність `system_prompt` для Darwin-агентів. |

---

## 2. Архітектура

### 2.1 Стек та запуск

- **Мова:** Python 3.12
- **Залежності:** `supabase`, `httpx`, `anthropic`, `openai`, `feedparser`, `schedule`, `python-dotenv`, `beautifulsoup4`, `aiohttp`
- **LLM:** за замовчуванням **Claude** (Anthropic, модель `claude-sonnet-4-5`); опційно **Ollama** (`OLLAMA_URL`, `OLLAMA_MODEL`)
- **БД:** Supabase (Auth Admin API для створення юзера, таблиці `agents`, `profiles`, `notifications`, `trinity_memory`)
- **Деплой:** Docker (Dockerfile у `darwin/`), Railway (`railway.toml`, service ID у Trinity `deploy.ts`)

### 2.2 Конфігурація (env)

| Змінна | Призначення |
|--------|-------------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Підключення до Supabase (обовʼязково). |
| `ANTHROPIC_API_KEY` | Claude (якщо не використовується Ollama). |
| `CLAUDE_MODEL` | Модель Claude (за замовч. `claude-sonnet-4-5`). |
| `OLLAMA_URL`, `OLLAMA_MODEL` | Якщо задані — генерування через Ollama замість Claude. |
| `GENESIS_API_URL` | Базовий URL платформи (за замовч. Vercel app). |
| `AGENTS_PER_DAY` | Скільки агентів реєструвати за один run (за замовч. 10). |
| `DARWIN_USER_ID` | Опційно: UUID користувача Darwin (інакше створюється/шукається при старті). |
| `OWNER_USER_ID` | UUID власника; при успішному run Darwin створює notification для нього. |

---

## 3. Життєвий цикл одного run

1. **Користувач Darwin**  
   `ensure_darwin_user()`: створює або знаходить користувача з email `darwin@genesis-node.internal`, оновлює `profiles` (role=dev, balance=999999).

2. **Контекст**  
   - Список існуючих `slug` агентів (щоб уникнути дублікатів).  
   - `get_successful_categories()`: які категорії мають найбільше виконаних тасків.  
   - `get_recent_agents_performance()`: як себе показують останні агенти, створені Darwin.

3. **Збір трендів**  
   `gather_all_trends()` паралельно викликає:
   - Hacker News (top/new stories),
   - Reddit (AI/tech/entrepreneurship subreddits),
   - Product Hunt (feed),
   - Google Trends (US, UK, Global),
   - GitHub (trending AI/ML repos),
   - ArXiv (останні статті cs.AI / cs.LG),
   - DEV.to (trending),
   - Indie Hackers (RSS).

   Результат — текстовий звіт «INTELLIGENCE REPORT» з секціями по джерелах.

4. **Генерація агентів**  
   - `build_darwin_system()` будує system prompt з історією продуктивності та успішними категоріями.  
   - `generate_agents()` відправляє в LLM (Claude або Ollama) trends + system; очікує **JSON-масив із 10 агентів** (name, slug, description, long_description, category_slug, price_per_task, tags, capabilities, use_cases, example_input/output, system_prompt).

5. **Якісний фільтр**  
   `_score_agent()` оцінює кожен агент (0–10): назва, опис, довжина system_prompt, наявність STEP/TASK_COMPLETE, capabilities, use_cases, категорія, ціна. Реєструються лише ті, хто набрав **> 4.0**, максимум `AGENTS_PER_RUN` штук.

6. **Реєстрація**  
   `register_agent()` для кожного кандидата: нормалізація slug, унікальність, валідні категорії, `config_blob` з полями `created_by: "darwin_v3"`, `source: "darwin"`, `auto_created: true` тощо. Insert у `agents` з `creator_id = DARWIN_USER_ID`.

7. **Після run**  
   - Запис у `trinity_memory` (agent=DARWIN, observation).  
   - Якщо `OWNER_USER_ID` заданий і щось зареєстровано — створення запису в `notifications` («Darwin published N new agents»).

---

## 4. Розклад та точкові запуски

- **При старті процесу:** один раз виконується `run_sync("startup")`.  
- **Щоденно (schedule):** 06:00, 14:00, 22:00 UTC — `run_sync("morning" | "afternoon" | "evening")`.  
- **Ручний запуск:** `python darwin.py --now` → один run з міткою `"manual"`.

---

## 5. Інтеграція з платформою

### 5.1 База даних

- **010_orchestrator_support.sql:** вставка профілю Darwin з фіксованим UUID `00000000-0000-0000-0000-d4rw1n000001` (role=dev, balance=999999). У коді Darwin при створенні через Auth отримує реальний UUID; цей запис — резерв/legacy.
- **011_welcome_credits_notifications.sql:** welcome credits нараховуються при `balance = 0`; у Darwin balance вже 999999, тому він не отримує 50 кредитів (фактичний «skip» для системного юзера).
- **trinity_memory:** Darwin пише після кожного run (observation), щоб інші агенти Trinity могли бачити його активність.
- **record_health_check (009):** cron health-check викликає RPC для кожного агента; для агентів із `config_blob.source === "darwin"` або `darwin === true` / `auto_created === true` не вимагається наявність `system_prompt` для статусу «healthy».

### 5.2 Trinity

- **self.ts:** у інструменті з передачею повідомлень між агентами є опція `target_agent: "DARWIN"`.
- **deploy.ts:** є інструменти `get_railway_services_status` та `restart_railway_service`; сервіс Darwin на Railway має імʼя `darwin` і ID `e042721f-6d4d-4aeb-97a7-aed038ed4917`.
- **hryhoriy.ts:** у контексті стратегії згадується: спочатку заповнити агентами (Darwin), потім залучати клієнтів.

---

## 6. Сильні сторони

- Багатоджерельна розвідка трендів (HN, Reddit, PH, Google Trends, GitHub, ArXiv, DEV.to, Indie Hackers).  
- Довгострокова «памʼять»: успішні категорії та історія продуктивності власних агентів впливають на наступні генерації.  
- Жорсткий вихід LLM: чіткий JSON-формат, парсинг через `_extract_json` (в т.ч. з markdown code block).  
- Якісний фільтр за балом перед реєстрацією.  
- Унікальні slug (хеш-суфікс при колізії), обмеження ціни 10–5000, валідні категорії.  
- Інтеграція з Trinity (memory, deploy, target_agent) та з платформою (notifications, health-check).

---

## 7. Ризики та обмеження

- **Частота та обʼєм:** 3 run на день × до 10 агентів = до 30 нових агентів на день; ризик переповнення маркетплейсу або дублікатів за змістом, якщо не буде дедуплікації по сенсу.  
- **Залежність від зовнішніх API:** Reddit, Google Trends, GitHub (rate limit без token), Product Hunt, ArXiv тощо можуть обмежувати або блокувати запити; помилки ловляться, але run може пройти з частково порожніми трендами.  
- **Один LLM на генерацію:** або Claude, або Ollama; немає fallback при збої або перевищенні ліміту.  
- **Фіксований UUID у міграції 010:** не використовується, якщо Darwin створюється через Auth (інший UUID); можливе розходження профілю в БД.  
- **Schedule в одному процесі:** якщо контейнер перезапускається, «вікно» 06/14/22 UTC може зміщуватись; для жорсткого розкладу краще зовнішній cron (наприклад, виклик `--now` з Vercel Cron або Railway cron).

---

## 8. Рекомендації

1. **Дедуплікація:** перед реєстрацією перевіряти схожість назв/описів з існуючими агентами (наприклад, embedding + поріг подібності) або обмежити кількість агентів від Darwin на категорію.  
2. **Fallback LLM:** при помилці/таймауті Claude спробувати Ollama або навпаки.  
3. **Розклад:** винести запуск у зовнішній cron (наприклад, HTTP endpoint захищений CRON_SECRET), щоб Darwin просто виконував один run і виходив; розклад гарантовано в UTC.  
4. **Метрики:** збирати в trinity_memory або окрему таблицю: скільки агентів згенеровано/зареєстровано за run, середній score, топ категорії — для подальшої оптимізації промптів і порогів.  
5. **Обмеження по категоріях:** не реєструвати більше N агентів у одній категорії за день, щоб збалансувати різноманітність маркетплейсу.

---

## 9. Файлова структура (релевантні файли)

```
darwin/
  darwin.py           # основний код
  requirements.txt
  Dockerfile
  railway.toml
  .env.example
  docs/
    DARWIN-AGENT-ANALYSIS.md  # цей документ
```

**Посилання в репо:**

- `app/api/cron/health-check/route.ts` — врахування Darwin-агентів при health check.
- `supabase/migrations/010_orchestrator_support.sql` — профіль Darwin.
- `supabase/migrations/011_welcome_credits_notifications.sql` — коментар про skip Darwin.
- `trinity/src/tools/deploy.ts` — Railway service darwin, restart.
- `trinity/src/tools/self.ts` — target_agent DARWIN.
- `trinity/src/agents/hryhoriy.ts` — стратегія «спочатку Darwin, потім клієнти».
