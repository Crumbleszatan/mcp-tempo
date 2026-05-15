import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  tempoGet,
  tempoPost,
  tempoPut,
  tempoDelete,
  toErrorResult,
  type PaginatedResponse,
} from "../tempo-client.js";

// [SEC-I4] Reusable date schema — enforces YYYY-MM-DD format before forwarding to Tempo API.
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format");

export function registerCapacityPlannerTools(server: McpServer): void {
  // ─── search_plans ────────────────────────────────────────────────────────────
  server.registerTool(
    "search_plans",
    {
      description:
        "Search Tempo Capacity Planner plans (planned time allocations). " +
        "Filter by user, date range, or issue/project. " +
        "This is the main way to query plans in Tempo API v4.",
      inputSchema: z.object({
        accountIds: z
          .array(z.string())
          .optional()
          .describe("Jira accountIds of the assignees to filter by, e.g. [\"abc123\"]"),
        from: dateString.optional().describe("Start date (YYYY-MM-DD)"),
        to: dateString.optional().describe("End date (YYYY-MM-DD)"),
        planItemId: z
          .number()
          .optional()
          .describe("Jira issue or project ID the plan is linked to"),
        planItemType: z
          .enum(["ISSUE", "PROJECT", "OTHER"])
          .optional()
          .describe("Type of item the plan is linked to"),
        limit: z.number().min(1).max(5000).default(50).describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoPost<PaginatedResponse<unknown>>("/plans/search", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── get_user_plans ──────────────────────────────────────────────────────────
  server.registerTool(
    "get_user_plans",
    {
      description:
        "Get all Capacity Planner plans assigned to a specific user. " +
        "Returns their planned time allocations across all issues and projects.",
      inputSchema: z.object({
        accountId: z.string().describe("Jira user accountId"),
        from: dateString.optional().describe("Start date filter (YYYY-MM-DD)"),
        to: dateString.optional().describe("End date filter (YYYY-MM-DD)"),
        limit: z.number().min(1).max(5000).default(50).describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<PaginatedResponse<unknown>>(
          `/plans/user/${encodeURIComponent(input.accountId)}`,
          { from: input.from, to: input.to, limit: input.limit, offset: input.offset }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── create_plan ─────────────────────────────────────────────────────────────
  server.registerTool(
    "create_plan",
    {
      description:
        "Create a new Capacity Planner plan (time allocation for a user on an issue or project). " +
        "Use plannedSecondsPerDay for the daily allocation (e.g. 28800 = 8h).",
      inputSchema: z.object({
        assigneeId: z.string().describe("Jira accountId of the person being planned"),
        assigneeType: z
          .enum(["USER", "GENERIC"])
          .default("USER")
          .describe("Type of assignee: USER (default) or GENERIC"),
        planItemId: z
          .number()
          .describe("Jira issue or project ID to plan against (integer)"),
        planItemType: z
          .enum(["ISSUE", "PROJECT", "OTHER"])
          .describe("Type of item: ISSUE, PROJECT, or OTHER"),
        startDate: dateString.describe("Plan start date (YYYY-MM-DD)"),
        endDate: dateString.describe("Plan end date (YYYY-MM-DD)"),
        plannedSecondsPerDay: z
          .number()
          .describe("Planned seconds per working day (e.g. 28800 for 8h)"),
        includeNonWorkingDays: z
          .boolean()
          .default(false)
          .describe("Whether to include weekends and holidays"),
        description: z.string().optional().describe("Optional description"),
      }),
    },
    async ({ assigneeId, assigneeType, ...rest }) => {
      try {
        // Tempo v4 POST /plans requires assigneeId + assigneeType
        const data = await tempoPost<unknown>("/plans", { assigneeId, assigneeType, ...rest });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── update_plan ─────────────────────────────────────────────────────────────
  server.registerTool(
    "update_plan",
    {
      description:
        "Update an existing Capacity Planner plan by its Tempo plan ID. " +
        "Tempo requires all mandatory fields even on update — always provide assigneeId, assigneeType, " +
        "planItemId, planItemType, startDate, endDate and plannedSecondsPerDay.",
      inputSchema: z.object({
        planId: z.string().describe("Tempo plan ID to update"),
        assigneeId: z.string().describe("Jira accountId of the assignee (required by Tempo even on update)"),
        assigneeType: z
          .enum(["USER", "GENERIC"])
          .default("USER")
          .describe("Type of assignee: USER or GENERIC"),
        planItemId: z.number().describe("Jira issue or project ID (required by Tempo even on update)"),
        planItemType: z
          .enum(["ISSUE", "PROJECT", "OTHER"])
          .describe("Type of item: ISSUE, PROJECT, or OTHER (required by Tempo even on update)"),
        startDate: dateString.describe("Plan start date (YYYY-MM-DD)"),
        endDate: dateString.describe("Plan end date (YYYY-MM-DD)"),
        plannedSecondsPerDay: z.number().describe("Planned seconds per working day"),
        includeNonWorkingDays: z
          .boolean()
          .optional()
          .describe("Include weekends and holidays"),
        description: z.string().optional().describe("New description"),
      }),
    },
    async ({ planId, ...rest }) => {
      try {
        const data = await tempoPut<unknown>(`/plans/${encodeURIComponent(planId)}`, rest);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── delete_plan ─────────────────────────────────────────────────────────────
  server.registerTool(
    "delete_plan",
    {
      description: "Delete a Capacity Planner plan by its Tempo plan ID. Irreversible.",
      inputSchema: z.object({
        planId: z.string().describe("Tempo plan ID to delete"),
      }),
    },
    async (input) => {
      try {
        await tempoDelete(`/plans/${encodeURIComponent(input.planId)}`);
        return { content: [{ type: "text", text: `Plan ${input.planId} deleted.` }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── get_teams ───────────────────────────────────────────────────────────────
  server.registerTool(
    "get_teams",
    {
      description:
        "List all Tempo teams in your organisation. " +
        "Use this to get team IDs before querying team capacity.",
      inputSchema: z.object({
        limit: z.number().min(1).max(5000).default(50).describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<PaginatedResponse<unknown>>("/teams", {
          limit: input.limit,
          offset: input.offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── get_team_members ────────────────────────────────────────────────────────
  server.registerTool(
    "get_team_members",
    {
      description:
        "Get the members of a Tempo team by team ID. " +
        "Returns each member's Jira accountId, role, and membership dates.",
      inputSchema: z.object({
        teamId: z.string().describe("Tempo team ID"),
        limit: z.number().min(1).max(5000).default(50).describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<PaginatedResponse<unknown>>(
          `/teams/${encodeURIComponent(input.teamId)}/members`,
          { limit: input.limit, offset: input.offset }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );
}
