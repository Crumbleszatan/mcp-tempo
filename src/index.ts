#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TempoClient } from "./client.js";
import { ToolDefinition } from "./tools/types.js";
import { loadTokens } from "./token-store.js";
import { OAuthConfig } from "./oauth.js";

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

// Aggregate all tools
const allTools: ToolDefinition[] = [
  ...worklogTools,
  ...accountTools,
  ...customerTools,
  ...teamTools,
  ...planTools,
  ...timesheetApprovalTools,
  ...programTools,
  ...holidaySchemeTools,
  ...workloadSchemeTools,
  ...roleTools,
  ...skillTools,
  ...genericResourceTools,
  ...workAttributeTools,
  ...userScheduleTools,
  ...periodTools,
  ...globalConfigTools,
  ...webhookTools,
  ...auditTools,
  ...projectTools,
  ...portfolioTools,
  ...billingRateTools,
  ...reportTools,
];

// Configuration from environment
const TEMPO_BASE_URL = process.env.TEMPO_BASE_URL || "https://api.tempo.io";

// OAuth config (required for token refresh)
const clientId = process.env.TEMPO_CLIENT_ID;
const clientSecret = process.env.TEMPO_CLIENT_SECRET;
const jiraInstance = process.env.TEMPO_JIRA_INSTANCE;
const redirectPort = parseInt(process.env.TEMPO_REDIRECT_PORT || "9876", 10);

let oauthConfig: OAuthConfig | null = null;
if (clientId && clientSecret && jiraInstance) {
  oauthConfig = {
    clientId,
    clientSecret,
    redirectUri: `http://localhost:${redirectPort}/oauth/callback`,
    jiraCloudInstance: jiraInstance,
    tempoBaseUrl: TEMPO_BASE_URL,
  };
}

// Resolve authentication: OAuth tokens first, then static API token fallback
const tokens = loadTokens();
const staticToken = process.env.TEMPO_API_TOKEN || null;

if (!tokens && !staticToken) {
  console.error("WARNING: No authentication configured. Tools will return errors until auth is set up.");
  console.error("  Option 1 — OAuth 2.0: Set TEMPO_CLIENT_ID, TEMPO_CLIENT_SECRET, TEMPO_JIRA_INSTANCE then run: npm run auth");
  console.error("  Option 2 — API token: Set TEMPO_API_TOKEN environment variable");
}

if (tokens) {
  console.error(`Using OAuth 2.0 tokens (expires: ${new Date(tokens.expires_at).toISOString()})`);
} else {
  console.error("Using static API token (legacy mode)");
}

const client = new TempoClient({
  baseUrl: TEMPO_BASE_URL,
  tokens,
  oauthConfig,
  staticToken,
});

// Create the MCP server
const server = new McpServer({
  name: "tempo",
  version: "1.0.0",
});

// Register all tools dynamically
for (const tool of allTools) {
  server.tool(
    tool.name,
    tool.description,
    tool.inputSchema,
    async (args) => {
      try {
        const result = await tool.handler(client, args as Record<string, unknown>);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const authMode = tokens ? "OAuth 2.0" : "API token";
  console.error(
    `Tempo MCP server running with ${allTools.length} tools (${authMode}, base URL: ${TEMPO_BASE_URL})`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
