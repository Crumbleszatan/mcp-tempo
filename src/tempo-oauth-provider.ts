import { Response } from "express";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import {
  OAuthRegisteredClientsStore,
} from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";

// --- Config ---
const TEMPO_CLIENT_ID = process.env.TEMPO_CLIENT_ID || "";
const TEMPO_CLIENT_SECRET = process.env.TEMPO_CLIENT_SECRET || "";
const TEMPO_JIRA_INSTANCE = process.env.TEMPO_JIRA_INSTANCE || "";
const TEMPO_BASE_URL = process.env.TEMPO_BASE_URL || "https://api.tempo.io";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3000";

// HMAC key derived from client secret
const HMAC_KEY = TEMPO_CLIENT_SECRET || "default-key";

// --- Signed state encoding (no in-memory storage needed) ---

interface StatePayload {
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  mcpState?: string;
}

function signState(payload: StatePayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", HMAC_KEY).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyState(state: string): StatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = createHmac("sha256", HMAC_KEY).update(data).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

// --- In-memory stores (only for short-lived data within single request flows) ---

// Map: our auth code -> { tempoCode, payload } (lives from callback to token exchange, seconds)
const pendingExchanges = new Map<string, {
  tempoCode: string;
  payload: StatePayload;
}>();

// Map: MCP access token -> Tempo token data
const accessTokens = new Map<string, {
  tempoAccessToken: string;
  tempoRefreshToken: string;
  tempoExpiresAt: number;
  clientId: string;
  scopes: string[];
}>();

// Map: MCP refresh token -> MCP access token
const refreshTokens = new Map<string, string>();

/**
 * Clients store - auto-registers and accepts any client.
 */
export class TempoClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    return this.clients.get(clientId);
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): Promise<OAuthClientInformationFull> {
    const fullClient: OAuthClientInformationFull = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };
    this.clients.set(fullClient.client_id, fullClient);
    console.error(`[OAuth] Client registered: ${fullClient.client_id} (${client.client_name || "unnamed"})`);
    return fullClient;
  }
}

/**
 * OAuth provider that proxies auth to Tempo's OAuth 2.0.
 * Uses signed state parameters to survive server restarts.
 */
export class TempoOAuthProvider implements OAuthServerProvider {
  private _clientsStore = new TempoClientsStore();

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  skipLocalPkceValidation = true;

  /**
   * Redirect to Tempo's auth page. All needed data is encoded in the state.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const payload: StatePayload = {
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      clientId: client.client_id,
      mcpState: params.state,
    };

    const signedState = signState(payload);
    console.error(`[OAuth] authorize: clientId=${client.client_id}, redirectUri=${params.redirectUri}`);

    const tempoAuthUrl = new URL(
      `https://${TEMPO_JIRA_INSTANCE}.atlassian.net/plugins/servlet/ac/io.tempo.jira/oauth-authorize/`
    );
    tempoAuthUrl.searchParams.set("client_id", TEMPO_CLIENT_ID);
    tempoAuthUrl.searchParams.set("redirect_uri", `${PUBLIC_URL}/oauth/callback`);
    tempoAuthUrl.searchParams.set("access_type", "tenant_user");
    tempoAuthUrl.searchParams.set("state", signedState);

    res.redirect(tempoAuthUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const pending = pendingExchanges.get(authorizationCode);
    if (!pending) throw new Error("Unknown authorization code");
    return pending.payload.codeChallenge;
  }

  /**
   * Exchange our auth code for tokens by exchanging Tempo's code behind the scenes.
   */
  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string
  ): Promise<OAuthTokens> {
    const pending = pendingExchanges.get(authorizationCode);
    if (!pending) throw new Error("Unknown authorization code");

    console.error(`[OAuth] exchangeCode: exchanging Tempo code for tokens`);

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: TEMPO_CLIENT_ID,
      client_secret: TEMPO_CLIENT_SECRET,
      redirect_uri: `${PUBLIC_URL}/oauth/callback`,
      code: pending.tempoCode,
    });

    const response = await fetch(`${TEMPO_BASE_URL}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tempo token exchange failed (${response.status}): ${text}`);
    }

    const tempoTokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    const mcpAccessToken = randomUUID();
    const mcpRefreshToken = randomUUID();

    accessTokens.set(mcpAccessToken, {
      tempoAccessToken: tempoTokens.access_token,
      tempoRefreshToken: tempoTokens.refresh_token,
      tempoExpiresAt: Date.now() + tempoTokens.expires_in * 1000,
      clientId: pending.payload.clientId,
      scopes: ["read", "write"],
    });

    refreshTokens.set(mcpRefreshToken, mcpAccessToken);
    pendingExchanges.delete(authorizationCode);

    console.error(`[OAuth] Token exchange successful`);

    return {
      access_token: mcpAccessToken,
      token_type: "Bearer",
      expires_in: tempoTokens.expires_in,
      refresh_token: mcpRefreshToken,
    };
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const mcpAccessToken = refreshTokens.get(refreshToken);
    if (!mcpAccessToken) throw new Error("Unknown refresh token");

    const stored = accessTokens.get(mcpAccessToken);
    if (!stored) throw new Error("Associated access token not found");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: TEMPO_CLIENT_ID,
      client_secret: TEMPO_CLIENT_SECRET,
      refresh_token: stored.tempoRefreshToken,
    });

    const response = await fetch(`${TEMPO_BASE_URL}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tempo token refresh failed (${response.status}): ${text}`);
    }

    const tempoTokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const newMcpAccessToken = randomUUID();
    const newMcpRefreshToken = randomUUID();

    accessTokens.set(newMcpAccessToken, {
      tempoAccessToken: tempoTokens.access_token,
      tempoRefreshToken: tempoTokens.refresh_token,
      tempoExpiresAt: Date.now() + tempoTokens.expires_in * 1000,
      clientId: stored.clientId,
      scopes: stored.scopes,
    });

    refreshTokens.set(newMcpRefreshToken, newMcpAccessToken);
    accessTokens.delete(mcpAccessToken);
    refreshTokens.delete(refreshToken);

    return {
      access_token: newMcpAccessToken,
      token_type: "Bearer",
      expires_in: tempoTokens.expires_in,
      refresh_token: newMcpRefreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const stored = accessTokens.get(token);
    if (!stored) {
      throw new Error("Invalid or expired access token");
    }

    return {
      token,
      clientId: stored.clientId,
      scopes: stored.scopes,
      expiresAt: Math.floor(stored.tempoExpiresAt / 1000),
      extra: {
        tempoAccessToken: stored.tempoAccessToken,
      },
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    const token = request.token;
    if (accessTokens.has(token)) accessTokens.delete(token);
    if (refreshTokens.has(token)) {
      const associated = refreshTokens.get(token);
      if (associated) accessTokens.delete(associated);
      refreshTokens.delete(token);
    }
  }
}

/**
 * Handle the Tempo OAuth callback.
 * Decodes the signed state, stores the Tempo code, redirects to Claude Desktop.
 */
export function handleTempoCallback(
  tempoCode: string,
  state: string
): { redirectUri: string } | { error: string } {
  console.error(`[OAuth] callback received, verifying signed state...`);

  const payload = verifyState(state);
  if (!payload) {
    console.error(`[OAuth] callback: INVALID signed state`);
    return { error: "Invalid or tampered state parameter." };
  }

  console.error(`[OAuth] callback: valid state for clientId=${payload.clientId}`);

  // Generate an auth code for the MCP client
  const ourCode = randomUUID();
  pendingExchanges.set(ourCode, { tempoCode, payload });

  // Auto-cleanup after 5 minutes
  setTimeout(() => pendingExchanges.delete(ourCode), 5 * 60 * 1000);

  // Redirect to Claude Desktop's callback
  const redirectUrl = new URL(payload.redirectUri);
  redirectUrl.searchParams.set("code", ourCode);
  if (payload.mcpState) {
    redirectUrl.searchParams.set("state", payload.mcpState);
  }

  return { redirectUri: redirectUrl.toString() };
}

/**
 * Get the Tempo access token for an MCP access token.
 */
export function getTempoTokenForMcpToken(mcpToken: string): string | null {
  const stored = accessTokens.get(mcpToken);
  return stored?.tempoAccessToken ?? null;
}
