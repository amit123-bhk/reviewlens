import crypto from "crypto";
import { PROMPT_VERSION } from "./prompts.js";

export function computeCacheKey(
  text,
  {
    model = process.env.LLM_MODEL || "llama-3.3-70b-versatile",
    version = PROMPT_VERSION,
  } = {}
) {
  const normalizedText = (text || "").trim().toLowerCase();
  const raw = `${model}${version}${normalizedText}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}
