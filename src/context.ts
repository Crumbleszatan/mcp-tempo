import { AsyncLocalStorage } from "async_hooks";

/**
 * Carries the Tempo Bearer access token for the lifetime of each SSE request.
 * Populated by the /sse handler and re-injected on every POST /message.
 */
export const tokenContext = new AsyncLocalStorage<string>();

export function getToken(): string {
  const token = tokenContext.getStore();
  if (token) return token;
  throw new Error("No Tempo token in context — request outside an active SSE session");
}
