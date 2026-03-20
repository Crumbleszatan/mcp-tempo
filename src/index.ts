#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { TempoClient } from "./client.js";
import { ToolDefinition } from "./tools/types.js";
import {
  TempoOAuthProvider,
  handleTempoCallback,
  getTempoTokenForMcpToken,
} from "./tempo-oauth-provider.js";

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
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

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

// --- OAuth provider ---
const oauthProvider = new TempoOAuthProvider();

// --- Express App ---
const app = express();

// CORS
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  next();
});
app.options("/{*splat}", (_req, res) => res.sendStatus(204));

// Log all requests
app.use((req, _res, next) => {
  console.error(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// --- MCP OAuth auth routes (/.well-known/*, /authorize, /token, /register) ---
app.use(
  mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl: new URL(PUBLIC_URL),
    baseUrl: new URL(PUBLIC_URL),
    serviceDocumentationUrl: new URL("https://github.com/Crumbleszatan/mcp-tempo"),
    scopesSupported: ["read", "write"],
  })
);

// --- Tempo OAuth callback (receives redirect from Tempo after user authorizes) ---
app.get("/oauth/callback", (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    res.status(400).send(`<h1>Authorization failed</h1><p>${error}</p>`);
    return;
  }

  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state parameter" });
    return;
  }

  const result = handleTempoCallback(code, state);

  if ("error" in result) {
    res.status(400).send(`<h1>Error</h1><p>${result.error}</p>`);
    return;
  }

  res.redirect(result.redirectUri);
});

// --- Bearer auth middleware for MCP endpoints ---
const authMiddleware = requireBearerAuth({
  verifier: oauthProvider,
});

// --- Health ---
app.get("/", (_req, res) => {
  res.json({
    name: "mcp-tempo",
    version: "1.0.0",
    status: "ok",
    tools: allTools.length,
    endpoints: {
      mcp: `${PUBLIC_URL}/mcp`,
      authorize: `${PUBLIC_URL}/authorize`,
    },
  });
});

// --- MCP Endpoints (protected by OAuth) ---

app.post("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const authInfo = (req as Request & { auth: AuthInfo }).auth;
  const tempoToken = getTempoTokenForMcpToken(authInfo.token);

  if (!tempoToken) {
    res.status(401).json({ error: "Tempo token not found for this session" });
    return;
  }

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

app.get("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const mcpSessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = mcpSessionId ? transports.get(mcpSessionId) : undefined;
  if (!transport) {
    res.status(400).json({ error: "Invalid or missing MCP session." });
    return;
  }
  await transport.handleRequest(req, res);
});

app.delete("/mcp", authMiddleware, async (req: Request, res: Response) => {
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
  console.error("Server error:", err);
  res.status(500).json({ error: err.message });
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.error(`Tempo MCP server running on ${PUBLIC_URL}`);
  console.error(`  MCP endpoint: ${PUBLIC_URL}/mcp`);
  console.error(`  OAuth metadata: ${PUBLIC_URL}/.well-known/oauth-authorization-server`);
  console.error(`  Tools: ${allTools.length}`);
});
