import { describe, expect, it } from "vitest";

import { csvSumChallenge } from "../challenges/csv-sum";
import { pathTraversalChallenge } from "../challenges/path-traversal";
import { sumRangeChallenge } from "../challenges/sum-range";
import { applySolution, challengeCategory, editableFiles, type Challenge } from "../lib/challenge";

describe("editableFiles", () => {
  it("is just the primary solution file for a single-file challenge", () => {
    expect(editableFiles(sumRangeChallenge)).toEqual([sumRangeChallenge.solutionFile]);
  });

  it("is the primary plus additional files for a multi-file challenge, primary first", () => {
    expect(editableFiles(csvSumChallenge)).toEqual(["parse.js", "sum.js"]);
  });
});

describe("challengeCategory", () => {
  it("defaults to correctness when unset", () => {
    expect(challengeCategory(sumRangeChallenge)).toBe("correctness");
  });

  it("reflects an explicit security category", () => {
    expect(challengeCategory(pathTraversalChallenge)).toBe("security");
  });
});

describe("applySolution", () => {
  const multi: Challenge = {
    id: "fixture",
    title: "fixture",
    prompt: "",
    files: { "a.js": "A0", "b.js": "B0", "a.test.js": "TEST" },
    solutionFile: "a.js",
    additionalSolutionFiles: ["b.js"],
    testCommand: ["node", "--test", "a.test.js"],
  };

  it("treats a bare string as the content of the primary solution file", () => {
    const result = applySolution(sumRangeChallenge, "NEW");
    expect(result[sumRangeChallenge.solutionFile]).toBe("NEW");
  });

  it("applies each editable file from a map, leaving the rest as starter", () => {
    const result = applySolution(multi, { "a.js": "A1", "b.js": "B1" });
    expect(result).toEqual({ "a.js": "A1", "b.js": "B1", "a.test.js": "TEST" });
  });

  it("keeps an editable file's starter content when the map omits it", () => {
    const result = applySolution(multi, { "b.js": "B1" });
    expect(result["a.js"]).toBe("A0");
    expect(result["b.js"]).toBe("B1");
  });

  it("ignores edits to non-editable files so the test file can never be overwritten", () => {
    const result = applySolution(multi, { "a.test.js": "HACKED", "a.js": "A1" });
    expect(result["a.test.js"]).toBe("TEST");
    expect(result["a.js"]).toBe("A1");
  });

  it("does not mutate the challenge's original files", () => {
    applySolution(multi, { "a.js": "A1" });
    expect(multi.files["a.js"]).toBe("A0");
  });
});
