# Growth Playbook — Як привести величезну кількість людей і конвертувати їх у підписки

Цей документ перераховує **усі канали залучення** та **конверсії в підписки**, з конкретними кроками, які можна виконувати в рамках продукту та маркетингу.

---

## 1. Що вже реалізовано в продукті (конверсія)

- **Dashboard:** банер "Credits running low" / "Unlock more with a subscription" при низькому балансі або free tier → посилання на `/pricing`.
- **Після завершення таску:** блок "Need more credits? Upgrade to a subscription" з CTA на `/pricing`.
- **Pricing:** блок рефералів "Invite friends — you both get 200 credits" + гарантія повернення кредитів.
- **Share page:** для кожного shared result — "Deploy this agent" та "Sign up free — 50 credits to start".
- **Сегментні лендіги:** `/for/developers`, `/for/teams` — один чіткий CTA (реєстрація або pricing).
- **Homepage:** один головний CTA "Get result in 60 sec", secondary "Sign up free", соціальний доказ (tasks completed, developers).
- **Email:** лист після першого таску з посиланням на маркетплейс і інформацією про 50 кредитів.

Використовуй ці точки дотику, щоб не втрачати тих, хто вже на сайті або в продукті.

---

## 2. Залучення (Acquisition) — усі шляхи

### 2.1 Органічний пошук (SEO)

- **Що робити:** опис сторінок (title, description), ключові слова на лендах (/for/developers, /for/teams, /compare, /pricing), структуровані дані (JSON-LD), sitemap, robots.txt.
- **Додатково:** блог або use-cases (`/blog`, `/use-cases`) — статті типу "How to automate X with AI agents", "Best AI agents for developers" з посиланнями на маркетплейс і pricing.
- **Метрики:** органічний трафік (GA), позиції по ключових запитах (Ahrefs/Semrush), конверсія з органіки в signup → перший таск → підписка.

### 2.2 Контент і комʼюніті

- **YouTube / TikTok / Shorts:** короткі відео "Я запустив AI-агента за 60 секунд", "Ось що зробив агент за 2 хвилини" з посиланням на демо та реєстрацію.
- **Dev.to, Hashnode, Medium:** статті від команди або запрошених авторів — "How we built an AI agent marketplace", кейси використання, інтеграції.
- **Reddit, Hacker News, Product Hunt:** публікації запуску, оновлень, обговорення без спаму; посилання в коментарях лише там, де це відповідь на питання.
- **Twitter/X, LinkedIn:** регулярні пости про кейси, цифри (tasks completed, нові агенти), реферальна програма, лід-магніти ("Get 100 credits" для підписників).

### 2.3 Реферальна та віральна механіка

- **В продукті:** реферальна картка на Dashboard, посилання в Referral Program; після таску — "Share result" → share page з CTA "Sign up free — 50 credits".
- **Посилення:** тимчасові бонуси (наприклад, "Цього місяця обидва отримують 300 кредитів"), лідерборд рефералів, email "Share your link and get X credits when friend signs up".
- **Відстеження:** UTM на посиланнях (`?ref=CODE`), аналіз джерел рефералів і конверсії реферала в підписку.

### 2.4 Платна реклама (Paid)

- **Google Ads:** ключі "AI agent", "automate with AI", "AI task automation" → ленди `/` або `/for/teams` / `/for/developers` залежно від інтенту.
- **Meta (Facebook/Instagram):** таргет на інтереси (developers, automation, no-code), креативи з результатами агентів та "First result in 60 sec".
- **LinkedIn:** таргет на B2B, менеджерів продукту, команди — ленд `/for/teams`, messaging про команди та передбачувані кредити.
- **Retargeting:** всі, хто відвідав pricing або запустив демо, але не зареєструвався — ремаркетинг з оферою "50 free credits" або "First task free".

### 2.5 Партнерства та інтеграції

- **Zapier / Make / n8n:** лістінг в каталогах, окрема сторінка `/integrations` з інструкціями; кожна інтеграція — канал залучення з їх трафіку.
- **Партнери (агентства, консультанти):** white-label або реферальні угоди — вони ведуть клієнтів на платформу, отримують % або кредити.
- **Developer advocates / інфлюенсери:** безкоштовні кредити або пріоритет для створення контенту про платформу в обмін на огляд або туторіал.

### 2.6 Email і повторна активність

- **Після реєстрації:** welcome-серія (що робити далі, перший таск, популярні агенти).
- **Після першого таску:** вже є лист з акцентом на "First task done" і посиланням на маркетплейс; можна додати "Upgrade to subscription and never run out".
- **Неактивні:** "You haven't run an agent in X days — here are 3 agents that might help" + посилання на маркетплейс і pricing.
- **Low credits:** лист "You have X credits left" з посиланням на top-up і на pricing (підписка).

### 2.7 B2B і команди

- **Ленд `/for/teams`:** вже є; можна додати форму "Contact for team plan" або "Book a demo" для великих обсягів.
- **In-product:** після N тасків або при підвищеному використанні — банер "Your team could save time — add seats" з посиланням на pricing або contact.
- **Outbound:** холодні листи/лінкедин до агентств, маркетингових команд, стартапів з описом кейсів (research, content, automation) і посиланням на /for/teams.

### 2.8 Лід-магніти (Lead capture)

- **Опціонально на головній або pricing:** "Get 100 extra credits — leave email" (потрібен endpoint + збереження в БД або сервіс типу Resend/ConvertKit); після підтвердження — надіслати код або автоматично нарахувати кредити після реєстрації по посиланню.
- **Гайди/чеклісти:** "Ultimate guide to AI agents" в обмін на email — далі nurture до реєстрації та підписки.

---

## 3. Воронка: від відвідувача до підписки

1. **Відвідувач** → демо за 60 сек (без реєстрації) або клік "Sign up free".
2. **Реєстрація** → 50–100 free credits, onboarding (якщо є).
3. **Перший таск** → email "First task done", посилання на маркетплейс і pricing.
4. **Повторні таски** → банер при низьких кредитах + після кожного completed — "Upgrade to subscription".
5. **Pricing page** → реферальний блок, гарантія, FAQ; один чіткий CTA на обраний план.
6. **Підписка** → Stripe Checkout; після оплати — welcome для платника (як користуватися, API, команда).

Кожен крок має один головний CTA і мінімум відволікань.

---

## 4. Що можна автоматизувати в коді далі

- **A/B тести:** різні заголовки/CTA на головній та pricing (наприклад, через feature flag або окремі варіанти сторінок).
- **Exit-intent popup:** при спробі закрити вкладку на pricing — "Wait — get 10% off your first month" з кодом або посиланням.
- **Чат-бот на сайті:** відповіді на типові питання та посилання на /pricing, /marketplace, /login.
- **Персоналізація:** якщо відомий segment (developer vs team) — показувати відповідний блок (For developers / For teams) на головній або після демо.

---

## 5. Метрики, які варто відстежувати

- **Acquisition:** трафік по каналах (organic, referral, paid, direct), cost per signup (для paid).
- **Activation:** % зареєстрованих, які зробили перший таск протягом 7 днів.
- **Revenue:** MRR, конверсія free → paid, LTV по когортах.
- **Referral:** кількість рефералів на користувача, конверсія реферала в підписку.

Якщо хочеш, можу запропонувати конкретні тексти для лендів, email-серій або рекламних креативів під будь-який з каналів вище.
