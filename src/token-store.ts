import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in ms
  token_type: string;
  scope?: string;
}

const TOKEN_FILE = join(homedir(), ".tempo-tokens.json");

export function loadTokens(): StoredTokens | null {
  // Allow override via env var
  const customPath = process.env.TEMPO_TOKEN_FILE;
  const path = customPath || TOKEN_FILE;

  if (!existsSync(path)) return null;

  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    if (!data.access_token || !data.refresh_token) return null;
    return data as StoredTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: StoredTokens): void {
  const customPath = process.env.TEMPO_TOKEN_FILE;
  const path = customPath || TOKEN_FILE;
  writeFileSync(path, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function getTokenFilePath(): string {
  return process.env.TEMPO_TOKEN_FILE || TOKEN_FILE;
}
