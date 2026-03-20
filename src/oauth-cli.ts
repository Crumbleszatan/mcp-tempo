#!/usr/bin/env node

/**
 * Interactive CLI to perform the OAuth 2.0 authorization flow.
 * Usage: npm run auth
 *
 * Required environment variables:
 *   TEMPO_CLIENT_ID       — OAuth client ID from Tempo settings
 *   TEMPO_CLIENT_SECRET   — OAuth client secret
 *   TEMPO_JIRA_INSTANCE   — Jira Cloud instance name (e.g. "mycompany")
 *
 * Optional:
 *   TEMPO_REDIRECT_PORT   — Local callback port (default 9876)
 *   TEMPO_BASE_URL        — Tempo API base URL (default https://api.tempo.io)
 *   TEMPO_TOKEN_FILE      — Custom path for token storage
 */

import { OAuthConfig, getAuthorizationUrl, exchangeCodeForTokens, startCallbackServer } from "./oauth.js";
import { getTokenFilePath, loadTokens } from "./token-store.js";

async function main() {
  const clientId = process.env.TEMPO_CLIENT_ID;
  const clientSecret = process.env.TEMPO_CLIENT_SECRET;
  const jiraInstance = process.env.TEMPO_JIRA_INSTANCE;

  if (!clientId || !clientSecret || !jiraInstance) {
    console.error("Missing required environment variables:");
    if (!clientId) console.error("  TEMPO_CLIENT_ID");
    if (!clientSecret) console.error("  TEMPO_CLIENT_SECRET");
    if (!jiraInstance) console.error("  TEMPO_JIRA_INSTANCE");
    console.error("\nSet them in your environment or .env file, then re-run.");
    process.exit(1);
  }

  const port = parseInt(process.env.TEMPO_REDIRECT_PORT || "9876", 10);
  const baseUrl = process.env.TEMPO_BASE_URL || "https://api.tempo.io";

  const config: OAuthConfig = {
    clientId,
    clientSecret,
    redirectUri: `http://localhost:${port}/oauth/callback`,
    jiraCloudInstance: jiraInstance,
    tempoBaseUrl: baseUrl,
  };

  // Check for existing tokens
  const existing = loadTokens();
  if (existing && existing.expires_at > Date.now()) {
    console.log("Existing valid tokens found.");
    console.log(`  Token file: ${getTokenFilePath()}`);
    console.log(`  Expires at: ${new Date(existing.expires_at).toISOString()}`);
    console.log("\nRe-running will generate new tokens. Proceeding...\n");
  }

  const authUrl = getAuthorizationUrl(config);

  console.log("=== Tempo OAuth 2.0 Authorization ===\n");
  console.log("1. Open this URL in your browser:\n");
  console.log(`   ${authUrl}\n`);
  console.log("2. Authorize the application in Tempo/Atlassian.");
  console.log(`3. You will be redirected to http://localhost:${port}/oauth/callback\n`);
  console.log("Waiting for authorization callback...\n");

  try {
    const code = await startCallbackServer(port);
    console.log("Authorization code received. Exchanging for tokens...\n");

    const tokens = await exchangeCodeForTokens(config, code);

    console.log("OAuth 2.0 setup complete!");
    console.log(`  Token file: ${getTokenFilePath()}`);
    console.log(`  Access token expires: ${new Date(tokens.expires_at).toISOString()}`);
    console.log(`  Scope: ${tokens.scope || "default"}`);
    console.log("\nYou can now start the MCP server with: npm start");
  } catch (err) {
    console.error("Authorization failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
