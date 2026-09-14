const BASE_URL = "http://localhost:8080/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
};

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, timeoutMs = 15_000 }: Options = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 204) return undefined as T;

    let data: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message =
        (data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : null) ?? "Erro inesperado";
      throw new ApiError(res.status, message);
    }

    return data as T;
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(
        408,
        "A solicitação demorou demais e foi cancelada. Tente novamente.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
