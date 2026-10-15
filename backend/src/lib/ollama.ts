import { z } from "zod";

const DEFAULT_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:3b";
// CPU-only inference is slow: a cold call (model load + generation) took
// ~3.5 min in local tests, so the default is deliberately generous.
const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_KEEP_ALIVE = "30m";
const PING_TIMEOUT_MS = 5_000;

export const ollamaUrl = () =>
  (process.env.OLLAMA_URL || DEFAULT_URL).replace(/\/+$/, "");

export const ollamaModel = () => process.env.OLLAMA_MODEL || DEFAULT_MODEL;

const timeoutMs = () =>
  Number(process.env.OLLAMA_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

// How long Ollama keeps the model in memory after a call, so the next day's
// summary skips the (slow) load. Ollama duration string, e.g. "30m", "-1".
const keepAlive = () => process.env.OLLAMA_KEEP_ALIVE || DEFAULT_KEEP_ALIVE;

export class OllamaError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OllamaError";
  }
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  temperature?: number;
  // Context window (tokens). Ollama's default (2048) is too small for a busy
  // day's event list plus instructions.
  numCtx?: number;
  // Upper bound on generated tokens.
  maxTokens?: number;
};

const chatResponseSchema = z.object({
  model: z.string(),
  message: z.object({ content: z.string() }),
  done: z.boolean(),
});

export type ChatResult = { text: string; model: string };

// Single non-streaming chat completion against the local Ollama server.
// Throws `OllamaError` on network failure, timeout, non-2xx or an unexpected
// body; callers decide whether that is fatal (the daily summary only logs).
export const chat = async (
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> => {
  const model = ollamaModel();

  let response: Response;
  try {
    response = await fetch(`${ollamaUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        keep_alive: keepAlive(),
        options: {
          temperature: options.temperature ?? 0.2,
          num_ctx: options.numCtx ?? 4096,
          num_predict: options.maxTokens ?? 600,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? `timed out after ${timeoutMs()}ms`
        : "is unreachable";
    throw new OllamaError(`Ollama at ${ollamaUrl()} ${reason}`, {
      cause: err,
    });
  }

  if (!response.ok) {
    // Ollama replies `{ error: "..." }`, e.g. "model 'x' not found".
    const detail = await response.text().catch(() => "");
    throw new OllamaError(
      `Ollama returned ${response.status}: ${detail.slice(0, 300)}`,
    );
  }

  const parsed = chatResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new OllamaError("Ollama returned an unexpected response body");
  }

  const text = parsed.data.message.content.trim();
  if (!text) throw new OllamaError("Ollama returned an empty response");

  return { text, model: parsed.data.model };
};

// True when the server answers and the configured model is pulled. Never
// throws; meant for health checks and startup logs.
export const pingOllama = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${ollamaUrl()}/api/tags`, {
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as {
      models?: { name?: string; model?: string }[];
    };
    const wanted = ollamaModel();
    return (body.models ?? []).some(
      (m) => m.name === wanted || m.model === wanted,
    );
  } catch {
    return false;
  }
};
