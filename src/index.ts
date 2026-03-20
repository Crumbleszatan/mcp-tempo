#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { TempoClient } from "./client.js";
import { ToolDefinition } from "./tools/types.js";
import { OAuthConfig, getAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken } from "./oauth.js";
import { getSession, setSession, deleteSession } from "./session-store.js";

// Import all tool modules
import { worklogTools } from "./tools/worklogs.js";
import { accountTools } from "./tools/accounts.js";
import { customerTools } from "./tools/customers.js";
import { teamTools } from "./tools/teams.js";
import { planTools } from "./tools/plans.js";
import { timesheetApprovalTools } from "./tools/timesheet-approvals.js";
import { programTools } from "./tools/programs.js";
import { holidaySchemeTools } from "./tools/holiday-schemes.js";
import { workloadSchemeTools } from "./tools/workload-schemes.js";
import { roleTools } from "./tools/roles-permissions.js";
import { skillTools } from "./tools/skills.js";
import { genericResourceTools } from "./tools/generic-resources.js";
import { workAttributeTools } from "./tools/work-attributes.js";
import { userScheduleTools } from "./tools/user-schedule.js";
import { periodTools } from "./tools/periods.js";
import { globalConfigTools } from "./tools/global-config.js";
import { webhookTools } from "./tools/webhooks.js";
import { auditTools } from "./tools/audit.js";
import { projectTools } from "./tools/projects.js";
import { portfolioTools } from "./tools/portfolios.js";
import { billingRateTools } from "./tools/billing-rates.js";
import { reportTools } from "./tools/reports.js";

const allTools: ToolDefinition[] = [
  ...worklogTools, ...accountTools, ...customerTools, ...teamTools,
  ...planTools, ...timesheetApprovalTools, ...programTools,
  ...holidaySchemeTools, ...workloadSchemeTools, ...roleTools,
  ...skillTools, ...genericResourceTools, ...workAttributeTools,
  ...userScheduleTools, ...periodTools, ...globalConfigTools,
  ...webhookTools, ...auditTools, ...projectTools, ...portfolioTools,
  ...billingRateTools, ...reportTools,
];

// --- Config ---
const PORT = parseInt(process.env.PORT || "3000", 10);
const TEMPO_BASE_URL = process.env.TEMPO_BASE_URL || "https://api.tempo.io";
const CLIENT_ID = process.env.TEMPO_CLIENT_ID || "";
const CLIENT_SECRET = process.env.TEMPO_CLIENT_SECRET || "";
const JIRA_INSTANCE = process.env.TEMPO_JIRA_INSTANCE || "";
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const REDIRECT_URI = `${PUBLIC_URL}/oauth/callback`;

const oauthConfig: OAuthConfig = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  jiraCloudInstance: JIRA_INSTANCE,
  tempoBaseUrl: TEMPO_BASE_URL,
};

// --- Register tools on a McpServer ---
function registerTools(server: McpServer, client: TempoClient) {
  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (args) => {
        try {
          const result = await tool.handler(client, args as Record<string, unknown>);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }
}

// --- MCP transports keyed by session ID ---
const transports = new Map<string, StreamableHTTPServerTransport>();

// --- Extract bearer token ---
function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// --- Resolve Tempo access token from request ---
async function resolveTempoToken(req: Request, res: Response): Promise<string | null> {
  const bearerToken = getBearerToken(req);
  const staticToken = process.env.TEMPO_API_TOKEN;

  if (bearerToken) {
    const session = getSession(bearerToken);
    if (session) {
      // Refresh if needed
      if (Date.now() >= session.expiresAt - 60_000 && CLIENT_ID && CLIENT_SECRET) {
        try {
          const refreshed = await refreshAccessToken(oauthConfig, session.refreshToken);
          session.accessToken = refreshed.access_token;
          session.refreshToken = refreshed.refresh_token;
          session.expiresAt = refreshed.expires_at;
          setSession(bearerToken, session);
        } catch {
          deleteSession(bearerToken);
          res.status(401).json({ error: "Token refresh failed. Re-authorize at /oauth/authorize" });
          return null;
        }
      }
      return session.accessToken;
    }
  }

  if (staticToken) return staticToken;

  res.status(401).json({
    error: "Unauthorized. Provide a Bearer token from /oauth/callback or set TEMPO_API_TOKEN.",
  });
  return null;
}

// --- Express App ---
const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  next();
});
app.options("/{*splat}", (_req, res) => res.sendStatus(204));

// ============ HEALTH ============
app.get("/", (_req, res) => {
  res.json({
    name: "mcp-tempo",
    version: "1.0.0",
    status: "ok",
    tools: allTools.length,
    endpoints: {
      mcp: `${PUBLIC_URL}/mcp`,
      authorize: `${PUBLIC_URL}/oauth/authorize`,
      status: `${PUBLIC_URL}/oauth/status`,
    },
  });
});

// ============ OAUTH ENDPOINTS ============

app.get("/oauth/authorize", (_req, res) => {
  if (!CLIENT_ID || !JIRA_INSTANCE) {
    res.status(500).json({ error: "TEMPO_CLIENT_ID and TEMPO_JIRA_INSTANCE not configured" });
    return;
  }
  const authUrl = getAuthorizationUrl(oauthConfig);
  res.redirect(authUrl);
});

app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    res.status(400).send(`<h1>Authorization failed</h1><p>${error}</p>`);
    return;
  }

  if (!code) {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(oauthConfig, code);
    const sessionToken = randomUUID();
    setSession(sessionToken, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at,
    });

    res.send(`
      <h1>Authorization successful!</h1>
      <p>Your session token (use as Bearer token for MCP):</p>
      <pre style="background:#f0f0f0;padding:12px;border-radius:6px;word-break:break-all">${sessionToken}</pre>
      <p>Configure your MCP client with:</p>
      <pre style="background:#f0f0f0;padding:12px;border-radius:6px">URL: ${PUBLIC_URL}/mcp\nAuthorization: Bearer ${sessionToken}</pre>
      <p>You can close this window.</p>
    `);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Token exchange failed" });
  }
});

app.get("/oauth/status", (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }
  const session = getSession(token);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({
    authenticated: true,
    expiresAt: new Date(session.expiresAt).toISOString(),
    expired: Date.now() >= session.expiresAt,
  });
});

// ============ MCP ENDPOINT ============

// POST /mcp — main MCP protocol handler
app.post("/mcp", async (req, res) => {
  const tempoToken = await resolveTempoToken(req, res);
  if (!tempoToken) return;

  const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = mcpSessionId ? transports.get(mcpSessionId) : undefined;

  if (!transport && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (id) => {
        transports.set(id, transport!);
        console.error(`MCP session created: ${id}`);
      },
    });

    transport.onclose = () => {
      const sid = transport!.sessionId;
      if (sid) {
        transports.delete(sid);
        console.error(`MCP session closed: ${sid}`);
      }
    };

    const client = new TempoClient({ baseUrl: TEMPO_BASE_URL, staticToken: tempoToken });
    const mcpServer = new McpServer({ name: "tempo", version: "1.0.0" });
    registerTools(mcpServer, client);
    await mcpServer.connect(transport);
  }

  if (!transport) {
    res.status(400).json({ error: "Invalid or missing MCP session. Send an initialize request first." });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp — SSE stream for server-to-client notifications
app.get("/mcp", async (req, res) => {
  const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = mcpSessionId ? transports.get(mcpSessionId) : undefined;
  if (!transport) {
    res.status(400).json({ error: "Invalid or missing MCP session." });
    return;
  }
  await transport.handleRequest(req, res);
});

// DELETE /mcp — close MCP session
app.delete("/mcp", async (req, res) => {
  const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = mcpSessionId ? transports.get(mcpSessionId) : undefined;
  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// --- Error handler ---
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error("Express error:", err);
  res.status(500).json({ error: err.message });
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.error(`Tempo MCP server running on ${PUBLIC_URL}`);
  console.error(`  MCP endpoint: ${PUBLIC_URL}/mcp`);
  console.error(`  OAuth authorize: ${PUBLIC_URL}/oauth/authorize`);
  console.error(`  Tools: ${allTools.length}`);
});
