import { describe, it, expect } from "vitest";
import {
  TASK_CATEGORIES,
  TASK_TEMPLATES,
  getTemplatesByCategory,
  getTemplateById,
} from "../task-templates";
import type { TaskTemplate } from "../task-templates";

describe("TASK_CATEGORIES", () => {
  it("has the expected number of categories", () => {
    expect(TASK_CATEGORIES.length).toBe(10);
  });

  it('includes an "all" category', () => {
    const all = TASK_CATEGORIES.find((c) => c.id === "all");
    expect(all).toBeDefined();
    expect(all!.label).toBe("All");
  });

  it("has unique IDs", () => {
    const ids = TASK_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every category has non-empty emoji and label", () => {
    for (const cat of TASK_CATEGORIES) {
      expect(cat.emoji.length).toBeGreaterThan(0);
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });
});

describe("TASK_TEMPLATES", () => {
  it("has more than 0 templates", () => {
    expect(TASK_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("every template has a unique id", () => {
    const ids = TASK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template has required fields", () => {
    for (const t of TASK_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.goal).toBeTruthy();
      expect(t.estimatedCredits).toBeGreaterThan(0);
      expect(Array.isArray(t.tags)).toBe(true);
      expect(t.tags.length).toBeGreaterThan(0);
    }
  });

  it('every template category exists in TASK_CATEGORIES (excluding "all")', () => {
    const validCategories = new Set(TASK_CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id));
    for (const t of TASK_TEMPLATES) {
      expect(validCategories.has(t.category)).toBe(true);
    }
  });
});

describe("getTemplatesByCategory", () => {
  it('returns all templates for category "all"', () => {
    const result = getTemplatesByCategory("all");
    expect(result).toBe(TASK_TEMPLATES);
    expect(result.length).toBe(TASK_TEMPLATES.length);
  });

  it("filters templates by category", () => {
    const research = getTemplatesByCategory("research");
    expect(research.length).toBeGreaterThan(0);
    research.forEach((t) => expect(t.category).toBe("research"));
  });

  it("returns empty array for non-existent category", () => {
    const result = getTemplatesByCategory("nonexistent-category");
    expect(result).toEqual([]);
  });

  it("returns correct count for code templates", () => {
    const code = getTemplatesByCategory("code");
    const expected = TASK_TEMPLATES.filter((t) => t.category === "code").length;
    expect(code.length).toBe(expected);
  });

  it("returns correct count for seo templates", () => {
    const seo = getTemplatesByCategory("seo");
    const expected = TASK_TEMPLATES.filter((t) => t.category === "seo").length;
    expect(seo.length).toBe(expected);
  });
});

describe("getTemplateById", () => {
  it("returns the correct template for a valid id", () => {
    const result = getTemplateById("competitor-analysis");
    expect(result).toBeDefined();
    expect(result!.title).toBe("Competitor Analysis");
    expect(result!.category).toBe("research");
  });

  it("returns undefined for non-existent id", () => {
    const result = getTemplateById("does-not-exist");
    expect(result).toBeUndefined();
  });

  it("can find every template by its id", () => {
    for (const t of TASK_TEMPLATES) {
      const found = getTemplateById(t.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(t.id);
    }
  });

  it("returns correct fields for blog-post template", () => {
    const blogPost = getTemplateById("blog-post") as TaskTemplate;
    expect(blogPost.category).toBe("content");
    expect(blogPost.estimatedCredits).toBe(350);
    expect(blogPost.tags).toContain("seo");
  });
});
