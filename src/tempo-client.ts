import { config } from "./config.js";
import { getToken } from "./context.js";

export interface PaginatedResponse<T> {
  metadata: { count: number; offset: number; limit: number; next?: string };
  results: T[];
}

// [SEC-M4] Maximum time to wait for a Tempo API response.
// Prevents indefinite hangs from saturating the Node.js event loop under load.
const TEMPO_REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

async function tempoRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(`${config.tempo.baseUrl}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const token = getToken();

  // [SEC-M4] Abort the request if Tempo doesn't respond within the timeout.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEMPO_REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Tempo ${method} ${path} → request timed out after ${TEMPO_REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Tempo ${method} ${path} → ${res.status}: ${detail}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const tempoGet = <T>(
  path: string,
  params?: Record<string, string | number | undefined>
) => tempoRequest<T>("GET", path, undefined, params);

export const tempoPost = <T>(path: string, body: unknown) =>
  tempoRequest<T>("POST", path, body);

export const tempoPut = <T>(path: string, body: unknown) =>
  tempoRequest<T>("PUT", path, body);

export const tempoDelete = (path: string) =>
  tempoRequest<void>("DELETE", path);

// [SEC-I1] Truncate raw Tempo error messages to avoid leaking verbose internal details
// (e.g. full stack traces, internal field names) back to the LLM context.
const MAX_ERROR_LENGTH = 500;

export function toErrorResult(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  const message = raw.length > MAX_ERROR_LENGTH
    ? `${raw.slice(0, MAX_ERROR_LENGTH)}… (truncated)`
    : raw;
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}
