import { describe, expect, it } from "vitest";

import { validateSubmission, type ChallengeSubmissionInput } from "../lib/challengeSource";

function validSubmission(overrides: Partial<ChallengeSubmissionInput> = {}): ChallengeSubmissionInput {
  return {
    slug: "reverse-string",
    authorName: "ivan",
    title: "Reverse a string",
    prompt: "fix reverseStr in a.js",
    files: { "a.js": "module.exports = {};", "a.test.js": "require('node:test');" },
    solutionFile: "a.js",
    testCommand: ["node", "--test", "a.test.js"],
    ...overrides,
  };
}

describe("validateSubmission", () => {
  it("accepts a well-formed submission", () => {
    expect(validateSubmission(validSubmission())).toBeNull();
  });

  it("rejects a slug with uppercase or invalid characters", () => {
    expect(validateSubmission(validSubmission({ slug: "Reverse_String" }))).toMatch(/slug/);
  });

  it("rejects a slug that collides with a built-in challenge id", () => {
    expect(validateSubmission(validSubmission({ slug: "sum-range" }))).toMatch(/collides/);
  });

  it("rejects a solutionFile that isn't one of the submitted files", () => {
    expect(validateSubmission(validSubmission({ solutionFile: "missing.js" }))).toMatch(/solutionFile/);
  });

  it("rejects anything other than exactly node --test <file>", () => {
    expect(validateSubmission(validSubmission({ testCommand: ["node", "a.test.js"] }))).toMatch(
      /testCommand/
    );
    expect(validateSubmission(validSubmission({ testCommand: ["bash", "-c", "rm -rf /"] }))).toMatch(
      /testCommand/
    );
    expect(
      validateSubmission(validSubmission({ testCommand: ["node", "--test", "a.test.js", "extra"] }))
    ).toMatch(/testCommand/);
  });

  it("rejects a testCommand file that wasn't submitted in files", () => {
    expect(
      validateSubmission(validSubmission({ testCommand: ["node", "--test", "other.test.js"] }))
    ).toMatch(/testCommand/);
  });

  it("rejects a testCommand file that doesn't end in .test.js", () => {
    const files = { "a.js": "x", "a.spec.js": "y" };
    expect(
      validateSubmission(
        validSubmission({ files, testCommand: ["node", "--test", "a.spec.js"] })
      )
    ).toMatch(/\.test\.js/);
  });

  it("rejects missing required text fields", () => {
    expect(validateSubmission(validSubmission({ authorName: "  " }))).toMatch(/authorName/);
    expect(validateSubmission(validSubmission({ title: "" }))).toMatch(/title/);
    expect(validateSubmission(validSubmission({ prompt: "" }))).toMatch(/prompt/);
    expect(validateSubmission(validSubmission({ files: {} }))).toMatch(/files/);
  });
});
