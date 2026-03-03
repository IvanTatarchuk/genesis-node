-- ============================================================
-- GENESIS NODE – Seed: 3 Official Demo Agents
-- ============================================================

-- Create a "system" user in auth.users for official agents
DO $$
DECLARE
  system_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Insert system user into auth.users if not exists
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES (
    system_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'system@genesisnode.ai',
    '$2a$10$system_placeholder_not_loginable',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Genesis Node","avatar_url":"/logo.png"}',
    false, '', '', '', ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create profile for system user
  INSERT INTO public.profiles (id, role, display_name, balance)
  VALUES (system_id, 'dev', 'Genesis Node Official', 0)
  ON CONFLICT (id) DO NOTHING;

  -- ── Agent 1: Web Researcher ──────────────────────────────────
  INSERT INTO public.agents (
    id, creator_id, name, slug,
    description, long_description,
    config_blob, price_per_task, tags, is_active, is_featured
  )
  VALUES (
    gen_random_uuid(), system_id,
    'Web Researcher',
    'web-researcher',
    'Deep web research & report generation in minutes.',
    '## Web Researcher

Autonomously searches the web, reads articles, cross-references sources and produces a structured Markdown report. Perfect for **market research**, competitor analysis, and due diligence.

### What it does
1. Breaks your goal into 3-5 specific research questions
2. Searches the web for each question
3. Reads and extracts key information from top results
4. Cross-references information across sources
5. Writes a comprehensive Markdown report

### Output
A structured report with: Summary, Key Findings, and cited Sources.',
    '{"system_prompt": "You are an expert research analyst. Given a goal, you must:\n1. Break the goal into 3-5 specific research questions.\n2. Search the web for each question using Playwright.\n3. Read and extract key information from top results.\n4. Cross-reference information across sources.\n5. Write a comprehensive Markdown report with sections: Summary, Key Findings, Sources.\nAlways cite your sources. Be concise but thorough."}',
    50, ARRAY['research','web','reports','analysis'], true, true
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ── Agent 2: Code Reviewer ───────────────────────────────────
  INSERT INTO public.agents (
    id, creator_id, name, slug,
    description, long_description,
    config_blob, price_per_task, tags, is_active, is_featured
  )
  VALUES (
    gen_random_uuid(), system_id,
    'Code Reviewer',
    'code-reviewer',
    'Reviews your GitHub repo and suggests improvements.',
    '## Code Reviewer

Analyzes a codebase for bugs, security vulnerabilities, performance issues, and code style violations. Returns a **prioritized list of actionable improvements** with code snippets.

### What it does
1. Browses the repository structure
2. Identifies the main language and framework
3. Checks for: security vulnerabilities, performance bottlenecks, code duplication, missing error handling
4. For each issue: describes the problem, severity (critical/high/medium/low), and provides a concrete fix

### Output
A structured Markdown report with severity ratings and ready-to-use code fixes.',
    '{"system_prompt": "You are a senior software engineer and security expert. Given a GitHub URL and goal:\n1. Clone or browse the repository.\n2. Identify the main language and framework.\n3. Check for: security vulnerabilities, performance bottlenecks, code duplication, missing error handling, outdated dependencies.\n4. For each issue found: describe the problem, its severity (critical/high/medium/low), and provide a concrete fix with code example.\n5. Output a structured report in Markdown."}',
    75, ARRAY['code','github','security','review'], true, true
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ── Agent 3: Data Scraper ────────────────────────────────────
  INSERT INTO public.agents (
    id, creator_id, name, slug,
    description, long_description,
    config_blob, price_per_task, tags, is_active, is_featured
  )
  VALUES (
    gen_random_uuid(), system_id,
    'Data Scraper',
    'data-scraper',
    'Scrapes any website and exports structured data as CSV/JSON.',
    '## Data Scraper

Navigates to a target website, identifies the data structure, handles pagination and dynamic content, and exports clean structured data in your preferred format.

### Works on
- Product listings & e-commerce catalogs
- Job boards & directories
- News feeds & article archives
- Any public website with tabular data

### What it does
1. Navigates to the target URL
2. Analyzes the page structure to identify data fields
3. Extracts all matching records, handling pagination automatically
4. Cleans and normalizes the data

### Output
A JSON array with consistent field names + a scraping summary.',
    '{"system_prompt": "You are a web scraping specialist. Given a URL and data goal:\n1. Navigate to the target URL using Playwright.\n2. Analyze the page structure to identify the data fields.\n3. Extract all matching records, handling pagination automatically.\n4. Clean and normalize the extracted data.\n5. Output the data as a JSON array with consistent field names.\n6. Include a summary: total records scraped, fields extracted, any errors encountered."}',
    60, ARRAY['scraping','data','csv','automation'], true, true
  )
  ON CONFLICT (slug) DO NOTHING;

END $$;
