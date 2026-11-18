import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { callLLM } from "../src/llmClient.js";

describe("llmClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "https://api.groq.com/openai/v1";
    process.env.LLM_MODEL = "llama-3.3-70b-versatile";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws clear error when LLM_API_KEY is missing", async () => {
    delete process.env.LLM_API_KEY;
    await expect(
      callLLM({ system: "sys", user: "usr" })
    ).rejects.toThrow("LLM_API_KEY environment variable is missing");
  });

  it("retries on 429 twice then succeeds on 200 with growing delays", async () => {
    const sleepDelays = [];
    const mockSleep = vi.fn(async (ms) => {
      sleepDelays.push(ms);
    });

    let calls = 0;
    const mockFetch = vi.fn(async () => {
      calls += 1;
      if (calls <= 2) {
        return {
          ok: false,
          status: 429,
          headers: new Headers(),
          text: async () => "Rate limit exceeded",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"sentiment":"positive"}' } }],
        }),
      };
    });

    const result = await callLLM(
      { system: "Analyze review", user: "Great shoes" },
      { fetchFn: mockFetch, sleepFn: mockSleep }
    );

    expect(result).toBe('{"sentiment":"positive"}');
    expect(calls).toBe(3);
    expect(mockSleep).toHaveBeenCalledTimes(2);
    // Delays should grow: 1s base (+jitter) then 2s base (+jitter)
    expect(sleepDelays[0]).toBeGreaterThanOrEqual(1000);
    expect(sleepDelays[1]).toBeGreaterThanOrEqual(2000);
    expect(sleepDelays[1]).toBeGreaterThan(sleepDelays[0]);
  });

  it("always 500 gives up after max retries and throws", async () => {
    const sleepDelays = [];
    const mockSleep = vi.fn(async (ms) => {
      sleepDelays.push(ms);
    });

    let calls = 0;
    const mockFetch = vi.fn(async () => {
      calls += 1;
      return {
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => "Internal Server Error",
      };
    });

    await expect(
      callLLM(
        { system: "Analyze review", user: "Great shoes" },
        { fetchFn: mockFetch, sleepFn: mockSleep }
      )
    ).rejects.toThrow(/after 4 retries/i);

    // Initial call + 4 retries = 5 calls
    expect(calls).toBe(5);
    expect(mockSleep).toHaveBeenCalledTimes(4);
  });

  it("400 does not retry and fails immediately", async () => {
    const mockSleep = vi.fn();
    let calls = 0;
    const mockFetch = vi.fn(async () => {
      calls += 1;
      return {
        ok: false,
        status: 400,
        headers: new Headers(),
        text: async () => "Bad Request: invalid json",
      };
    });

    await expect(
      callLLM(
        { system: "Analyze review", user: "Bad input" },
        { fetchFn: mockFetch, sleepFn: mockSleep }
      )
    ).rejects.toThrow(/status 400/i);

    expect(calls).toBe(1);
    expect(mockSleep).not.toHaveBeenCalled();
  });

  it("respects Retry-After header", async () => {
    const sleepDelays = [];
    const mockSleep = vi.fn(async (ms) => {
      sleepDelays.push(ms);
    });

    let calls = 0;
    const headers = new Headers();
    headers.set("retry-after", "6");

    const mockFetch = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 429,
          headers,
          text: async () => "Rate limit exceeded",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"sentiment":"neutral"}' } }],
        }),
      };
    });

    const result = await callLLM(
      { system: "Analyze review", user: "Normal experience" },
      { fetchFn: mockFetch, sleepFn: mockSleep }
    );

    expect(result).toBe('{"sentiment":"neutral"}');
    expect(calls).toBe(2);
    expect(mockSleep).toHaveBeenCalledTimes(1);
    expect(sleepDelays[0]).toBe(6000);
  });
});
