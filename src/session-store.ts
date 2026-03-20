/**
 * In-memory session store.
 * Maps session tokens (UUIDs given to users after OAuth) to their Tempo tokens.
 *
 * For production at scale, swap this for Redis (e.g. Railway Redis add-on).
 */

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export const sessions = new Map<string, SessionData>();

export function getSession(token: string): SessionData | undefined {
  return sessions.get(token);
}

export function setSession(token: string, data: SessionData): void {
  sessions.set(token, data);
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}
