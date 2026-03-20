import { StoredTokens, loadTokens, saveTokens } from "./token-store.js";
import { OAuthConfig, refreshAccessToken } from "./oauth.js";

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query?: Record<string, string | string[] | number | boolean | undefined>;
  body?: unknown;
}

export class TempoClient {
  private baseUrl: string;
  private tokens: StoredTokens | null;
  private oauthConfig: OAuthConfig | null;
  // Fallback: static API token (backwards-compatible)
  private staticToken: string | null;

  constructor(opts: {
    baseUrl: string;
    tokens?: StoredTokens | null;
    oauthConfig?: OAuthConfig | null;
    staticToken?: string | null;
  }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.tokens = opts.tokens ?? null;
    this.oauthConfig = opts.oauthConfig ?? null;
    this.staticToken = opts.staticToken ?? null;
  }

  /**
   * Ensure we have a valid access token, refreshing if expired.
   */
  private async getAccessToken(): Promise<string> {
    // Static token mode (backwards-compat)
    if (this.staticToken) {
      return this.staticToken;
    }

    if (!this.tokens) {
      throw new Error(
        "No OAuth tokens available. Run `npm run auth` to authenticate first."
      );
    }

    // Refresh if token expires within 60 seconds
    const bufferMs = 60 * 1000;
    if (Date.now() >= this.tokens.expires_at - bufferMs) {
      if (!this.oauthConfig) {
        throw new Error(
          "OAuth config missing — cannot refresh token. Set TEMPO_CLIENT_ID and TEMPO_CLIENT_SECRET."
        );
      }
      console.error("Access token expired, refreshing...");
      this.tokens = await refreshAccessToken(
        this.oauthConfig,
        this.tokens.refresh_token
      );
      console.error("Token refreshed successfully.");
    }

    return this.tokens.access_token;
  }

  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${options.path}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, String(v));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
    };

    if (
      options.body &&
      options.method !== "GET" &&
      options.method !== "DELETE"
    ) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (response.status === 204) {
      return { success: true } as T;
    }

    const text = await response.text();
    if (!text) {
      return { success: true, status: response.status } as T;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Tempo API returned non-JSON response (${response.status}): ${text.substring(0, 500)}`
      );
    }

    if (!response.ok) {
      // If 401, token might be invalid — clear and signal
      if (response.status === 401 && this.tokens && this.oauthConfig) {
        console.error("Got 401 — attempting token refresh...");
        try {
          this.tokens = await refreshAccessToken(
            this.oauthConfig,
            this.tokens.refresh_token
          );
          // Retry once
          headers.Authorization = `Bearer ${this.tokens.access_token}`;
          const retryResponse = await fetch(url.toString(), {
            ...fetchOptions,
            headers,
          });
          const retryText = await retryResponse.text();
          if (retryResponse.ok) {
            return retryText ? JSON.parse(retryText) : ({ success: true } as T);
          }
        } catch {
          // Refresh also failed
        }
      }
      throw new Error(
        `Tempo API error (${response.status}): ${JSON.stringify(data)}`
      );
    }

    return data as T;
  }
}
