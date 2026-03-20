# mcp-tempo-oauth

MCP server for the Tempo time tracking API with **OAuth 2.0** authentication.

## Setup

### 1. Install

```bash
npm install
npm run build
```

### 2. Create OAuth Application in Tempo

1. Go to **Tempo > Settings > Data Access > OAuth 2.0 Applications**
2. Click **Add Application**
3. Set:
   - **Name**: `mcp-tempo-oauth`
   - **Redirect URL**: `http://localhost:9876/oauth/callback`
   - **Grant Type**: Authorization code
4. Copy the generated **Client ID** and **Client Secret**

### 3. Configure Environment

```bash
export TEMPO_CLIENT_ID="your-client-id"
export TEMPO_CLIENT_SECRET="your-client-secret"
export TEMPO_JIRA_INSTANCE="your-instance"  # e.g. "mycompany" for mycompany.atlassian.net
```

Optional variables:
- `TEMPO_BASE_URL` — API base URL (default: `https://api.tempo.io`)
- `TEMPO_REDIRECT_PORT` — Callback port (default: `9876`)
- `TEMPO_TOKEN_FILE` — Custom token storage path (default: `~/.tempo-tokens.json`)

### 4. Authenticate

```bash
npm run auth
```

This opens a browser-based OAuth flow:
1. Opens authorization URL
2. You authorize in Tempo/Atlassian
3. Callback receives tokens
4. Tokens saved to `~/.tempo-tokens.json`

### 5. Run the MCP Server

```bash
npm start
```

## Claude Desktop / Claude Code Configuration

```json
{
  "mcpServers": {
    "tempo": {
      "command": "node",
      "args": ["/path/to/mcp-tempo-oauth/dist/index.js"],
      "env": {
        "TEMPO_CLIENT_ID": "your-client-id",
        "TEMPO_CLIENT_SECRET": "your-client-secret",
        "TEMPO_JIRA_INSTANCE": "your-instance"
      }
    }
  }
}
```

## Legacy Mode (API Token)

Still supported as fallback. Set `TEMPO_API_TOKEN` instead of OAuth variables:

```json
{
  "mcpServers": {
    "tempo": {
      "command": "node",
      "args": ["/path/to/mcp-tempo-oauth/dist/index.js"],
      "env": {
        "TEMPO_API_TOKEN": "your-static-token"
      }
    }
  }
}
```

## Token Refresh

Access tokens are **automatically refreshed** when they expire. The refresh happens transparently during API calls — no user intervention needed. Updated tokens are persisted to disk.

## Features

- OAuth 2.0 Authorization Code flow with automatic token refresh
- Backwards-compatible with static API tokens
- 250+ tools covering all Tempo API endpoints
- Zod schema validation for all tool inputs
