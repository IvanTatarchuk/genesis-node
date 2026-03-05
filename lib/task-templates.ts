export interface TaskTemplate {
  id: string;
  emoji: string;
  title: string;
  category: string;
  goal: string;
  estimatedCredits: number;
  tags: string[];
}

export const TASK_CATEGORIES = [
  { id: "all",       label: "All",          emoji: "✨" },
  { id: "research",  label: "Research",     emoji: "🔍" },
  { id: "content",   label: "Content",      emoji: "✍️" },
  { id: "code",      label: "Code",         emoji: "💻" },
  { id: "data",      label: "Data",         emoji: "📊" },
  { id: "web",       label: "Web Scraping", emoji: "🕷️" },
  { id: "seo",       label: "SEO",          emoji: "📈" },
  { id: "social",    label: "Social Media", emoji: "📱" },
  { id: "finance",   label: "Finance",      emoji: "💰" },
  { id: "outreach",  label: "Outreach",     emoji: "📧" },
];

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ── Research ──────────────────────────────────────────────────────────────
  {
    id: "competitor-analysis",
    emoji: "🔍",
    title: "Competitor Analysis",
    category: "research",
    goal: "Research the top 5 competitors of [YOUR COMPANY/PRODUCT]. For each competitor, find: pricing, key features, target audience, strengths and weaknesses. Provide a comparison table and a strategic summary.",
    estimatedCredits: 300,
    tags: ["research", "strategy", "market"],
  },
  {
    id: "market-research",
    emoji: "📊",
    title: "Market Research Report",
    category: "research",
    goal: "Research the [INDUSTRY] market. Find: market size, key players, growth trends, customer pain points, and emerging opportunities. Summarize in a structured report with sources.",
    estimatedCredits: 400,
    tags: ["research", "market", "report"],
  },
  {
    id: "news-digest",
    emoji: "📰",
    title: "Daily News Digest",
    category: "research",
    goal: "Search the web for the top 10 most important news stories about [TOPIC] from the last 24 hours. For each story: write a 2-sentence summary, rate importance 1-10, and provide the source URL.",
    estimatedCredits: 200,
    tags: ["research", "news", "daily"],
  },
  {
    id: "linkedin-research",
    emoji: "👤",
    title: "Person / Company Research",
    category: "research",
    goal: "Research [PERSON NAME / COMPANY NAME]. Find: background, recent news, key achievements, social media presence, and any relevant public information. Organize findings by category.",
    estimatedCredits: 250,
    tags: ["research", "linkedin", "outreach"],
  },

  // ── Content ────────────────────────────────────────────────────────────────
  {
    id: "blog-post",
    emoji: "✍️",
    title: "SEO Blog Post",
    category: "content",
    goal: "Write a detailed 1500-word SEO-optimized blog post about '[TOPIC]'. Include: an engaging headline, introduction with a hook, 5-7 main sections with H2 headers, actionable tips, a conclusion with CTA, and a list of 10 related keywords to target.",
    estimatedCredits: 350,
    tags: ["content", "seo", "blog"],
  },
  {
    id: "linkedin-post",
    emoji: "💼",
    title: "LinkedIn Post",
    category: "social",
    goal: "Write 3 LinkedIn post variations about [TOPIC/ACHIEVEMENT/INSIGHT]. Each should be: 150-300 words, start with a hook, use short paragraphs, include a thought-provoking question at the end, and 5 relevant hashtags.",
    estimatedCredits: 150,
    tags: ["content", "linkedin", "social"],
  },
  {
    id: "product-description",
    emoji: "🛍️",
    title: "Product Description",
    category: "content",
    goal: "Write compelling product descriptions for [PRODUCT NAME]. Create: 1 short description (50 words), 1 medium description (150 words), 1 long description (400 words). Focus on benefits, not features. Include emotional triggers and a strong CTA.",
    estimatedCredits: 200,
    tags: ["content", "ecommerce", "marketing"],
  },
  {
    id: "email-sequence",
    emoji: "📧",
    title: "Email Drip Sequence",
    category: "outreach",
    goal: "Write a 5-email nurture sequence for [PRODUCT/SERVICE] targeting [TARGET AUDIENCE]. Email 1: Welcome, Email 2: Value (Day 3), Email 3: Case study (Day 7), Email 4: Overcome objections (Day 12), Email 5: Final offer (Day 16). Each email: subject line, preview text, full body.",
    estimatedCredits: 400,
    tags: ["email", "marketing", "outreach"],
  },

  // ── Code ────────────────────────────────────────────────────────────────────
  {
    id: "code-review",
    emoji: "🔎",
    title: "Code Review",
    category: "code",
    goal: "Review the following code and provide detailed feedback:\n\n[PASTE YOUR CODE HERE]\n\nCheck for: bugs, security vulnerabilities, performance issues, code style, and best practices. Provide specific improvement suggestions with corrected code examples.",
    estimatedCredits: 300,
    tags: ["code", "review", "development"],
  },
  {
    id: "api-docs",
    emoji: "📚",
    title: "API Documentation",
    category: "code",
    goal: "Generate comprehensive API documentation for the following endpoints:\n\n[PASTE API ROUTES/CODE]\n\nInclude: endpoint descriptions, request/response examples, error codes, authentication requirements, and usage examples in curl and JavaScript.",
    estimatedCredits: 350,
    tags: ["code", "docs", "api"],
  },
  {
    id: "unit-tests",
    emoji: "✅",
    title: "Write Unit Tests",
    category: "code",
    goal: "Write comprehensive unit tests for the following code:\n\n[PASTE YOUR CODE]\n\nUse [JEST/PYTEST/VITEST]. Include: happy path tests, edge cases, error handling tests, and mock examples. Aim for 90%+ coverage.",
    estimatedCredits: 300,
    tags: ["code", "testing", "quality"],
  },

  // ── Data ────────────────────────────────────────────────────────────────────
  {
    id: "csv-analysis",
    emoji: "📊",
    title: "CSV / Data Analysis",
    category: "data",
    goal: "Analyze the following data and provide insights:\n\n[PASTE CSV DATA OR DESCRIBE YOUR DATASET]\n\nFind: key trends, anomalies, top performers, correlations. Create a summary with actionable recommendations and suggest data visualizations.",
    estimatedCredits: 300,
    tags: ["data", "analysis", "spreadsheet"],
  },
  {
    id: "financial-summary",
    emoji: "💰",
    title: "Financial Data Summary",
    category: "finance",
    goal: "Analyze the financial data for [COMPANY/TICKER SYMBOL]. Research: revenue trends (last 4 quarters), profit margins, debt levels, P/E ratio compared to sector, major risks. Provide a buy/hold/sell recommendation with reasoning.",
    estimatedCredits: 350,
    tags: ["finance", "stocks", "analysis"],
  },

  // ── Web Scraping ────────────────────────────────────────────────────────────
  {
    id: "price-monitor",
    emoji: "🏷️",
    title: "Price Monitoring",
    category: "web",
    goal: "Go to [WEBSITE URL] and collect the current prices for all products in [CATEGORY/PAGE]. Return a structured list with: product name, current price, original price (if on sale), URL. Sort by price ascending.",
    estimatedCredits: 250,
    tags: ["web", "scraping", "ecommerce"],
  },
  {
    id: "leads-scrape",
    emoji: "🎯",
    title: "Lead Scraping",
    category: "web",
    goal: "Find [NUMBER] companies in the [INDUSTRY] industry in [LOCATION]. For each company, find: company name, website, estimated employee count, contact email or form URL, LinkedIn page. Format as a CSV.",
    estimatedCredits: 400,
    tags: ["web", "leads", "sales"],
  },
  {
    id: "job-listings",
    emoji: "💼",
    title: "Job Listings Aggregator",
    category: "web",
    goal: "Search for [JOB TITLE] positions in [LOCATION/REMOTE] on LinkedIn, Indeed, and Glassdoor. Return a list of the top 20 results with: company, title, salary range (if listed), requirements summary, and direct application URL.",
    estimatedCredits: 300,
    tags: ["web", "jobs", "research"],
  },

  // ── SEO ──────────────────────────────────────────────────────────────────────
  {
    id: "seo-audit",
    emoji: "📈",
    title: "SEO Audit",
    category: "seo",
    goal: "Perform an SEO audit of [YOUR WEBSITE URL]. Check: page titles & meta descriptions, heading structure, keyword usage, page speed indicators, broken links, mobile-friendliness signals, schema markup. Provide a prioritized list of fixes.",
    estimatedCredits: 350,
    tags: ["seo", "audit", "website"],
  },
  {
    id: "keyword-research",
    emoji: "🔑",
    title: "Keyword Research",
    category: "seo",
    goal: "Find the best SEO keywords for [TOPIC/NICHE/PRODUCT]. Provide 30 keywords with: estimated monthly search volume, competition level (low/med/high), search intent (informational/commercial/transactional), and content ideas for each cluster.",
    estimatedCredits: 300,
    tags: ["seo", "keywords", "content"],
  },

  // ── Social Media ─────────────────────────────────────────────────────────────
  {
    id: "social-calendar",
    emoji: "📅",
    title: "Social Media Calendar",
    category: "social",
    goal: "Create a 30-day social media content calendar for [BRAND/PRODUCT] targeting [AUDIENCE]. For each day: platform (Instagram/X/LinkedIn), post type (image/video/carousel/text), content idea, caption draft, hashtags, and best posting time.",
    estimatedCredits: 400,
    tags: ["social", "calendar", "marketing"],
  },
  {
    id: "twitter-thread",
    emoji: "🧵",
    title: "Twitter/X Thread",
    category: "social",
    goal: "Write a viral Twitter/X thread about [TOPIC]. Format: 10-15 tweets, hook tweet that grabs attention, each tweet max 280 characters, build a compelling narrative, end with a CTA. Include emojis and line breaks for readability.",
    estimatedCredits: 150,
    tags: ["social", "twitter", "content"],
  },
];

export function getTemplatesByCategory(category: string): TaskTemplate[] {
  if (category === "all") return TASK_TEMPLATES;
  return TASK_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.id === id);
}
