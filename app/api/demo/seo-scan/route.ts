import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 15;

interface SeoResult {
  url: string;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  h1Text: string | null;
  imgMissingAlt: number;
  canonical: string | null;
  robotsMeta: string | null;
  loadMs: number;
  score: number;
  issues: { severity: "critical" | "warning" | "ok"; message: string }[];
}

export async function POST(req: NextRequest) {
  let url = "";
  try {
    const body = await req.json();
    url = String(body.url ?? "").trim();
    if (!url.startsWith("http")) url = "https://" + url;
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const start = Date.now();
  let html = "";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GenesisNodeBot/1.0; +https://genesisnode.ai)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Could not fetch URL. Make sure it is publicly accessible." },
      { status: 422 }
    );
  }

  const loadMs = Date.now() - start;

  // ── Extract SEO signals ─────────────────────────────────────────────────
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const titleLength = title?.length ?? 0;

  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ) ?? html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
  );
  const description = descMatch ? descMatch[1].trim() : null;
  const descriptionLength = description?.length ?? 0;

  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) ?? [];
  const h1Count = h1Matches.length;
  const h1Text = h1Matches[0]
    ? h1Matches[0].replace(/<[^>]+>/g, "").trim().slice(0, 80)
    : null;

  const imgMatches = html.match(/<img[^>]+>/gi) ?? [];
  const imgMissingAlt = imgMatches.filter(
    (img) => !/alt=["'][^"']+["']/.test(img)
  ).length;

  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i
  ) ?? html.match(
    /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i
  );
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

  const robotsMatch = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i
  );
  const robotsMeta = robotsMatch ? robotsMatch[1].trim() : null;

  // ── Score & issues ──────────────────────────────────────────────────────
  const issues: SeoResult["issues"] = [];
  let score = 100;

  if (!title) {
    issues.push({ severity: "critical", message: "Missing <title> tag" });
    score -= 25;
  } else if (titleLength < 30) {
    issues.push({ severity: "warning", message: `Title too short (${titleLength} chars, aim for 50-60)` });
    score -= 10;
  } else if (titleLength > 60) {
    issues.push({ severity: "warning", message: `Title too long (${titleLength} chars, aim for 50-60)` });
    score -= 5;
  } else {
    issues.push({ severity: "ok", message: `Title length is good (${titleLength} chars)` });
  }

  if (!description) {
    issues.push({ severity: "critical", message: "Missing meta description" });
    score -= 20;
  } else if (descriptionLength < 70) {
    issues.push({ severity: "warning", message: `Meta description too short (${descriptionLength} chars, aim for 150-160)` });
    score -= 8;
  } else if (descriptionLength > 160) {
    issues.push({ severity: "warning", message: `Meta description too long (${descriptionLength} chars, aim for 150-160)` });
    score -= 5;
  } else {
    issues.push({ severity: "ok", message: `Meta description length is good (${descriptionLength} chars)` });
  }

  if (h1Count === 0) {
    issues.push({ severity: "critical", message: "No <h1> tag found on page" });
    score -= 20;
  } else if (h1Count > 1) {
    issues.push({ severity: "warning", message: `Multiple <h1> tags found (${h1Count}) — use only one` });
    score -= 10;
  } else {
    issues.push({ severity: "ok", message: "Single <h1> tag — good structure" });
  }

  if (imgMissingAlt > 0) {
    issues.push({ severity: "warning", message: `${imgMissingAlt} image(s) missing alt text` });
    score -= Math.min(imgMissingAlt * 3, 15);
  } else if (imgMatches.length > 0) {
    issues.push({ severity: "ok", message: "All images have alt text" });
  }

  if (!canonical) {
    issues.push({ severity: "warning", message: "No canonical URL defined" });
    score -= 5;
  } else {
    issues.push({ severity: "ok", message: "Canonical URL is set" });
  }

  if (loadMs > 3000) {
    issues.push({ severity: "warning", message: `Slow server response: ${loadMs}ms (aim < 1000ms)` });
    score -= 10;
  } else {
    issues.push({ severity: "ok", message: `Fast server response: ${loadMs}ms` });
  }

  score = Math.max(0, Math.min(100, score));

  const result: SeoResult = {
    url,
    title,
    titleLength,
    description,
    descriptionLength,
    h1Count,
    h1Text,
    imgMissingAlt,
    canonical,
    robotsMeta,
    loadMs,
    score,
    issues,
  };

  return NextResponse.json(result);
}
