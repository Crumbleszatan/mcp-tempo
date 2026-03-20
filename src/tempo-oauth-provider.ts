import { Response } from "express";
import { randomUUID } from "node:crypto";
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

// --- Tempo OAuth config ---
const TEMPO_CLIENT_ID = process.env.TEMPO_CLIENT_ID || "";
const TEMPO_CLIENT_SECRET = process.env.TEMPO_CLIENT_SECRET || "";
const TEMPO_JIRA_INSTANCE = process.env.TEMPO_JIRA_INSTANCE || "";
const TEMPO_BASE_URL = process.env.TEMPO_BASE_URL || "https://api.tempo.io";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3000";

// --- In-memory stores ---

// Map: authorization code -> { codeChallenge, redirectUri, tempoCode }
const authCodes = new Map<string, {
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  state?: string;
}>();

// Map: MCP access token -> Tempo access token + metadata
const accessTokens = new Map<string, {
  tempoAccessToken: string;
  tempoRefreshToken: string;
  tempoExpiresAt: number;
  clientId: string;
  scopes: string[];
}>();

// Map: MCP refresh token -> MCP access token (for refresh flow)
const refreshTokens = new Map<string, string>();

// Map: our auth code -> Tempo auth code (from Tempo's redirect)
const tempoAuthCodes = new Map<string, string>();

/**
 * Clients store - accepts any client that registers via dynamic registration.
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
    return fullClient;
  }
}

/**
 * OAuth provider that proxies auth to Tempo's OAuth 2.0.
 *
 * Flow:
 * 1. Claude Desktop calls /authorize -> we redirect to Tempo's authorization page
 * 2. Tempo redirects back to our /oauth/callback with a Tempo auth code
 * 3. We store the Tempo code and redirect Claude Desktop's redirect_uri with our own code
 * 4. Claude Desktop exchanges our code for tokens via /token
 * 5. We exchange the Tempo code for Tempo tokens, wrap them, and return MCP tokens
 */
export class TempoOAuthProvider implements OAuthServerProvider {
  private _clientsStore = new TempoClientsStore();

  get clientsStore(): OAuthRegisteredClientsStore {
    return this._clientsStore;
  }

  // Skip local PKCE because we handle it ourselves with Tempo
  skipLocalPkceValidation = true;

  /**
   * Step 1: Redirect to Tempo's authorization page.
   * We store the MCP client's redirect_uri and state, then redirect to Tempo.
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    // Generate our own auth code to track this flow
    const ourCode = randomUUID();

    authCodes.set(ourCode, {
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      clientId: client.client_id,
      state: params.state,
    });

    console.error(`[OAuth] authorize: stored authCode=${ourCode}, redirectUri=${params.redirectUri}, state=${params.state}`);

    // Redirect to Tempo OAuth, with OUR callback as redirect_uri
    // We pass ourCode in the state so we can link Tempo's response back
    const tempoAuthUrl = new URL(
      `https://${TEMPO_JIRA_INSTANCE}.atlassian.net/plugins/servlet/ac/io.tempo.jira/oauth-authorize/`
    );
    tempoAuthUrl.searchParams.set("client_id", TEMPO_CLIENT_ID);
    tempoAuthUrl.searchParams.set("redirect_uri", `${PUBLIC_URL}/oauth/callback`);
    tempoAuthUrl.searchParams.set("access_type", "tenant_user");
    tempoAuthUrl.searchParams.set("state", ourCode);

    res.redirect(tempoAuthUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const stored = authCodes.get(authorizationCode);
    if (!stored) throw new Error("Unknown authorization code");
    return stored.codeChallenge;
  }

  /**
   * Step 4: Exchange our auth code for tokens.
   * Behind the scenes, we exchange the Tempo code for Tempo tokens.
   */
  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string
  ): Promise<OAuthTokens> {
    const stored = authCodes.get(authorizationCode);
    if (!stored) throw new Error("Unknown authorization code");

    // Get the Tempo auth code that was stored during callback
    const tempoCode = tempoAuthCodes.get(authorizationCode);
    if (!tempoCode) throw new Error("Tempo authorization code not found. The OAuth callback may not have completed.");

    // Exchange Tempo code for Tempo tokens
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: TEMPO_CLIENT_ID,
      client_secret: TEMPO_CLIENT_SECRET,
      redirect_uri: `${PUBLIC_URL}/oauth/callback`,
      code: tempoCode,
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

    // Create MCP tokens that wrap Tempo tokens
    const mcpAccessToken = randomUUID();
    const mcpRefreshToken = randomUUID();

    accessTokens.set(mcpAccessToken, {
      tempoAccessToken: tempoTokens.access_token,
      tempoRefreshToken: tempoTokens.refresh_token,
      tempoExpiresAt: Date.now() + tempoTokens.expires_in * 1000,
      clientId: stored.clientId,
      scopes: ["read", "write"],
    });

    refreshTokens.set(mcpRefreshToken, mcpAccessToken);

    // Cleanup
    authCodes.delete(authorizationCode);
    tempoAuthCodes.delete(authorizationCode);

    return {
      access_token: mcpAccessToken,
      token_type: "Bearer",
      expires_in: tempoTokens.expires_in,
      refresh_token: mcpRefreshToken,
    };
  }

  /**
   * Refresh: exchange MCP refresh token for new tokens, refreshing Tempo tokens too.
   */
  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const mcpAccessToken = refreshTokens.get(refreshToken);
    if (!mcpAccessToken) throw new Error("Unknown refresh token");

    const stored = accessTokens.get(mcpAccessToken);
    if (!stored) throw new Error("Associated access token not found");

    // Refresh Tempo token
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

    // Create new MCP tokens
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

    // Cleanup old tokens
    accessTokens.delete(mcpAccessToken);
    refreshTokens.delete(refreshToken);

    return {
      access_token: newMcpAccessToken,
      token_type: "Bearer",
      expires_in: tempoTokens.expires_in,
      refresh_token: newMcpRefreshToken,
    };
  }

  /**
   * Verify an MCP access token and return the associated Tempo access token.
   */
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
    if (accessTokens.has(token)) {
      accessTokens.delete(token);
    }
    if (refreshTokens.has(token)) {
      const associated = refreshTokens.get(token);
      if (associated) accessTokens.delete(associated);
      refreshTokens.delete(token);
    }
  }
}

/**
 * Handle the Tempo OAuth callback.
 * Called when Tempo redirects back after user authorization.
 * Links the Tempo auth code to our internal auth code, then redirects to the MCP client.
 */
export function handleTempoCallback(
  tempoCode: string,
  state: string // our auth code
): { redirectUri: string } | { error: string } {
  console.error(`[OAuth] callback: state=${state}, authCodes.size=${authCodes.size}, keys=[${[...authCodes.keys()].join(", ")}]`);
  const stored = authCodes.get(state);
  if (!stored) {
    return { error: "Invalid state parameter — authorization flow not found." };
  }

  // Store the Tempo code, linked to our auth code
  tempoAuthCodes.set(state, tempoCode);

  // Redirect to the MCP client's redirect_uri with our auth code
  const redirectUrl = new URL(stored.redirectUri);
  redirectUrl.searchParams.set("code", state);
  if (stored.state) {
    redirectUrl.searchParams.set("state", stored.state);
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
