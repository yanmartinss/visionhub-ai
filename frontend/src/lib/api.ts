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

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(data: unknown): string {
  return (
    (data && typeof data === "object" && "error" in data
      ? String((data as { error: unknown }).error)
      : null) ?? "Erro inesperado"
  );
}

// Same as `apiFetch`, but also returns the HTTP status (e.g. 200 vs 202).
export async function apiRequest<T = unknown>(
  path: string,
  { method = "GET", body, timeoutMs = 15_000 }: Options = {},
): Promise<{ status: number; data: T }> {
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

    if (res.status === 204) return { status: 204, data: undefined as T };

    const data = parseBody(await res.text());

    if (!res.ok) throw new ApiError(res.status, errorMessage(data));

    return { status: res.status, data: data as T };
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

export async function apiFetch<T = unknown>(
  path: string,
  options: Options = {},
): Promise<T> {
  return (await apiRequest<T>(path, options)).data;
}

type UploadOptions = {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

// `fetch` cannot report upload progress, so file uploads go through XHR.
// There is no timeout: recordings are large and the user can cancel instead.
export function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  { onProgress, signal }: UploadOptions = {},
): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError(0, "Envio cancelado."));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      const data = parseBody(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, data: data as T });
      } else {
        reject(new ApiError(xhr.status, errorMessage(data)));
      }
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "Não foi possível conectar ao servidor."));
    xhr.onabort = () => reject(new ApiError(0, "Envio cancelado."));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(formData);
  });
}
