import { describe, it, expect } from "vitest";
import { computeCacheKey } from "../src/hash.js";

describe("hash module", () => {
  it("produces deterministic sha256 hex string", () => {
    const key1 = computeCacheKey("Great shoes!", { model: "m1", version: "v1" });
    const key2 = computeCacheKey("Great shoes!", { model: "m1", version: "v1" });
    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64);
  });

  it("normalizes text by trimming and lowercasing", () => {
    const key1 = computeCacheKey("  Great Shoes!  ", { model: "m1", version: "v1" });
    const key2 = computeCacheKey("great shoes!", { model: "m1", version: "v1" });
    expect(key1).toBe(key2);
  });

  it("changes key when model or version changes", () => {
    const key1 = computeCacheKey("Great shoes!", { model: "m1", version: "v1" });
    const key2 = computeCacheKey("Great shoes!", { model: "m2", version: "v1" });
    const key3 = computeCacheKey("Great shoes!", { model: "m1", version: "v2" });
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });
});
