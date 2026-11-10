import "server-only";
import type { z } from "zod";
import { env } from "@/lib/env";
import { AiError, AiRateLimitError, AiResponseError, AiUnavailableError } from "@/lib/errors";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 25_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export interface JsonRequest<T> {
  system: string;
  prompt: string;
  /** Gemini (OpenAPI-subset) response schema. */
  responseSchema: Record<string, unknown>;
  /** Runtime validation of what the model returned. */
  validator: z.ZodType<T>;
  temperature?: number;
}

/**
 * Calls Gemini and returns validated JSON. Retries rate limits, 5xx errors, timeouts
 * and malformed output with exponential backoff; everything else fails fast.
 * This is the ONLY place that talks to Gemini, and it only runs on the server.
 */
export async function generateJson<T>(req: JsonRequest<T>): Promise<T> {
  let lastError: AiError = new AiUnavailableError();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callGemini(req);
      return parseAndValidate(text, req.validator);
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      lastError = err;
      if (!err.retryable || attempt === MAX_ATTEMPTS - 1) break;
      await sleep(1500 * 2 ** attempt);
    }
  }
  throw lastError;
}

async function callGemini<T>({ system, prompt, responseSchema, temperature = 0.6 }: JsonRequest<T>): Promise<string> {
  const model = env.geminiModel;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema,
      // Thinking tokens add latency and count against the free-tier budget; this task does not need them.
      ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new AiUnavailableError("The AI service did not respond in time. Try again.");
  }

  if (res.status === 429) throw new AiRateLimitError();
  if (res.status >= 500) throw new AiUnavailableError();
  if (!res.ok) {
    console.error("[gemini] request rejected", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new AiUnavailableError(
      "The AI service rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL on the server.",
      false,
    );
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new AiResponseError(data?.promptFeedback?.blockReason ? "The AI declined to process this review." : undefined);
  }
  const text = candidate.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new AiResponseError("The AI returned an empty response. Try again.");
  return text;
}

function parseAndValidate<T>(raw: string, validator: z.ZodType<T>): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AiResponseError();
  }
  const result = validator.safeParse(parsed);
  if (!result.success) throw new AiResponseError();
  return result.data;
}
