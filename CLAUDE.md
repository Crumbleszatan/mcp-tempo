# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # tsc — compiles src/ → dist/
npm run dev        # tsc --watch
npm start          # node dist/index.js (run the HTTP MCP server)
npm run auth       # node dist/oauth-cli.js (local-token OAuth flow, writes ~/.tempo-tokens.json)
```

No linter, no test suite. After editing, run `npm run build` to type-check (tsconfig has `strict: true`).

Docker build: `docker build -t mcp-tempo .` — multi-stage, runs `npm run build` then `npm prune --production`.

## Required env vars (server)

- `TEMPO_CLIENT_ID`, `TEMPO_CLIENT_SECRET` — Tempo OAuth 2.0 app credentials
- `TEMPO_JIRA_INSTANCE` — Jira Cloud instance name (e.g. `support-madagence` → `<instance>.atlassian.net`)
- `PUBLIC_URL` — public origin of the deployed server; MUST match what MCP clients see (used to build OAuth redirect URIs and issuer metadata)
- `TEMPO_API_TOKEN` — single-tenant fallback; bypasses OAuth when set
- `TEMPO_BASE_URL` — defaults to `https://api.tempo.io`
- `PORT` — defaults to 3000

## Architecture

This is a remote MCP server that **proxies MCP OAuth 2.0 ↔ Tempo OAuth 2.0**. An MCP client (e.g. Claude Desktop) authenticates with *this* server; this server in turn authenticates with Tempo and forwards Tempo's access token on each API call.

### OAuth proxy flow (`src/tempo-oauth-provider.ts`)

`TempoOAuthProvider` implements the MCP SDK's `OAuthServerProvider` interface. The MCP SDK's `mcpAuthRouter` (mounted in `src/index.ts`) exposes the standard `/authorize`, `/token`, `/register`, `/.well-known/oauth-authorization-server` endpoints and delegates to this provider.

Flow:
1. MCP client hits `/authorize` → `authorize()` encodes `{codeChallenge, redirectUri, clientId, mcpState}` into an **HMAC-signed state string** (key = `TEMPO_CLIENT_SECRET`), redirects the user to Tempo's Atlassian auth page.
2. Tempo redirects back to `/oauth/callback` → `handleTempoCallback()` verifies the signature on `state`, stores the Tempo code in the `pendingExchanges` map under a freshly-minted MCP auth code, then redirects the MCP client back to its `redirectUri` with that code.
3. MCP client hits `/token` → `exchangeAuthorizationCode()` swaps the Tempo code for Tempo tokens, issues its own MCP access/refresh tokens, and stores the mapping in the `accessTokens` map.
4. `verifyAccessToken()` is used by `requireBearerAuth` middleware on `/mcp`. `getTempoTokenForMcpToken()` extracts the underlying Tempo access token so it can be used by `TempoClient`.

**Critical**: state is *signed, not stored* — the server is stateless for in-flight authorizations and survives restarts. In-memory maps (`pendingExchanges`, `accessTokens`, `refreshTokens`) only hold short-lived post-callback data. Do NOT replace signed state with in-memory storage (see git history: commit `f511993` fixed exactly this regression on Railway's multi-instance deployments).

### MCP transport (`src/index.ts`)

- Uses `StreamableHTTPServerTransport` from the MCP SDK; one transport per MCP session, keyed by `mcp-session-id` header in a `transports` Map.
- `/mcp` POST initializes a new transport when the body is an `initialize` request; otherwise looks up existing session.
- Each session gets its own `McpServer` instance and its own `TempoClient` (constructed with that session's Tempo token).
- `app.set("trust proxy", 1)` is required for Railway / reverse-proxy deploys.

### Tools (`src/tools/*.ts`)

253 tools, one `ToolDefinition[]` export per file, all concatenated in `src/index.ts`. Each tool is `{ name, description, inputSchema, handler }` where:
- `inputSchema` is a **raw Zod shape** (not `z.object(...)`), built via `objectSchema(properties, required)` from `src/tools/types.ts` — required keys stay required, others get `.optional()`.
- `handler(client, args)` calls `client.request({ method, path, query, body })` and returns the parsed JSON. Errors thrown here are caught in `index.ts` and returned as `{ isError: true }` MCP content.

When adding a tool: follow the pattern in `src/tools/worklogs.ts`. Use the `str()`, `num()`, `bool()`, `arr()`, `strEnum()` helpers for consistent `.describe()` calls. Path is relative to `TEMPO_BASE_URL` and typically starts with `/4/…` (Tempo API v4).

### Two OAuth implementations — don't confuse them

- `src/oauth.ts` + `src/oauth-cli.ts` + `src/token-store.ts` — **legacy local-only CLI flow** (`npm run auth`). Writes tokens to `~/.tempo-tokens.json`. Not used by the HTTP server; kept for single-user local setups.
- `src/tempo-oauth-provider.ts` — the real OAuth proxy used by the deployed server. This is what almost all changes will touch.

`src/session-store.ts` exists but is not imported anywhere in the active flow — treat it as dead code unless reintroducing pre-HMAC-state session handling.

## Deploy

Target is Railway (Dockerfile auto-detected). After deploy, OAuth redirect URL registered in Tempo must be `${PUBLIC_URL}/oauth/callback`.
