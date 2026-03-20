import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { StoredTokens, saveTokens } from "./token-store.js";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  jiraCloudInstance: string; // e.g. "mycompany" for mycompany.atlassian.net
  tempoBaseUrl: string;
}

/**
 * Build the authorization URL the user must visit.
 */
export function getAuthorizationUrl(config: OAuthConfig): string {
  const base = `https://${config.jiraCloudInstance}.atlassian.net/plugins/servlet/ac/io.tempo.jira/oauth-authorize/`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    access_type: "tenant_user",
  });
  return `${base}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(`${config.tempoBaseUrl}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  };

  const tokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${config.tempoBaseUrl}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  };

  const tokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Start a local HTTP server, open the authorization URL, and wait for the callback.
 * Returns the authorization code.
 */
export function startCallbackServer(
  port: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
        server.close();
        reject(new Error(`OAuth authorization denied: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p>`);
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    });

    server.listen(port, () => {
      console.error(`OAuth callback server listening on http://localhost:${port}`);
    });

    server.on("error", reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth callback timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}
