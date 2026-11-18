import dotenv from "dotenv";

dotenv.config();

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callLLM(
  { system, user },
  { fetchFn = globalThis.fetch, sleepFn = defaultSleep } = {}
) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY environment variable is missing");
  }

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "gemini-2.5-flash";
  const url = `${baseUrl}/chat/completions`;

  const payload = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  };

  const maxRetries = 4;
  let attempt = 0;

  while (attempt <= maxRetries) {
    let res;
    let networkError = null;

    try {
      res = await fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      networkError = err;
    }

    // Success case
    if (res && res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("Invalid LLM response: missing text content in choices");
      }
      return content;
    }

    // Determine status and whether we can retry
    const status = res ? res.status : null;
    const isRateLimit = status === 429;
    const isServerError = status !== null && status >= 500 && status <= 599;
    const isRetryable = networkError !== null || isRateLimit || isServerError;

    // Fail immediately on non-retryable errors (e.g. other 4xx)
    if (!isRetryable) {
      const errorBody = res ? await res.text().catch(() => "") : "";
      throw new Error(`LLM API failed with status ${status}: ${errorBody}`);
    }

    // If max retries reached, fail
    if (attempt >= maxRetries) {
      if (networkError) {
        throw new Error(`LLM API failed after ${maxRetries} retries: ${networkError.message}`);
      }
      const errorBody = res ? await res.text().catch(() => "") : "";
      throw new Error(`LLM API failed with status ${status} after ${maxRetries} retries: ${errorBody}`);
    }

    // Calculate backoff delay
    let delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
    const jitter = Math.floor(Math.random() * 200); // Small random jitter (0-199ms)
    delayMs += jitter;

    // Check for Retry-After header
    if (res) {
      const retryAfter = res.headers?.get ? res.headers.get("retry-after") : res.headers?.["retry-after"];
      if (retryAfter) {
        const parsedSec = Number(retryAfter);
        if (!Number.isNaN(parsedSec)) {
          delayMs = parsedSec * 1000;
        } else {
          const parsedDateMs = Date.parse(retryAfter) - Date.now();
          if (!Number.isNaN(parsedDateMs) && parsedDateMs > 0) {
            delayMs = parsedDateMs;
          }
        }
      }
    }

    await sleepFn(delayMs);
    attempt += 1;
  }
}
