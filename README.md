# mcp-tempo-oauth

Remote MCP server for the Tempo time tracking API with **OAuth 2.0** authentication.

Deployable on Railway, Fly.io, Render, or any Docker host.

## Quick Start (Local)

```bash
npm install && npm run build
TEMPO_API_TOKEN=your-token npm start
# Server running on http://localhost:3000
```

## Deploy on Railway

1. Connect your GitHub repo on [railway.app](https://railway.app)
2. Set environment variables:
   - `TEMPO_CLIENT_ID` — from Tempo OAuth app
   - `TEMPO_CLIENT_SECRET` — from Tempo OAuth app
   - `TEMPO_JIRA_INSTANCE` — e.g. `support-madagence`
   - `PUBLIC_URL` — your Railway URL (e.g. `https://mcp-tempo-production.up.railway.app`)
3. Deploy — Railway auto-detects the Dockerfile

## OAuth Setup

### 1. Create OAuth app in Tempo

Tempo > Settings > Data Access > OAuth 2.0 Applications:
- **Redirect URL**: `https://your-app.railway.app/oauth/callback`
- **Client type**: Confidential
- **Grant type**: Authorization code

### 2. Authorize

Visit `https://your-app.railway.app/oauth/authorize` in your browser. After authorizing, you'll receive a **session token**.

### 3. Connect Claude Desktop

```json
{
  "mcpServers": {
    "tempo": {
      "type": "streamable-http",
      "url": "https://your-app.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SESSION_TOKEN"
      }
    }
  }
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/mcp` | POST/GET/DELETE | MCP protocol (Streamable HTTP) |
| `/oauth/authorize` | GET | Start OAuth flow |
| `/oauth/callback` | GET | OAuth callback (receives tokens) |
| `/oauth/status` | GET | Check session status |

## Single-Tenant Mode (API Token)

For simple setups without OAuth, set `TEMPO_API_TOKEN`:

```json
{
  "mcpServers": {
    "tempo": {
      "type": "streamable-http",
      "url": "https://your-app.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer any-value"
      }
    }
  }
}
```

Note: In this mode, the Bearer token is ignored and the static `TEMPO_API_TOKEN` is used for all requests.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TEMPO_CLIENT_ID` | For OAuth | OAuth client ID |
| `TEMPO_CLIENT_SECRET` | For OAuth | OAuth client secret |
| `TEMPO_JIRA_INSTANCE` | For OAuth | Jira Cloud instance name |
| `PUBLIC_URL` | For deploy | Public URL of the server |
| `TEMPO_API_TOKEN` | For legacy | Static API token (fallback) |
| `TEMPO_BASE_URL` | No | API base URL (default: `https://api.tempo.io`) |
| `PORT` | No | HTTP port (default: `3000`) |

## Features

- 253 tools covering all Tempo API v4 endpoints
- OAuth 2.0 with automatic token refresh
- Streamable HTTP transport for remote MCP
- Backwards-compatible with static API tokens
- Docker-ready for any platform
