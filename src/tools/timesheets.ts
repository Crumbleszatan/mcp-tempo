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

export function registerTimesheetTools(server: McpServer): void {
  // ─── get_worklogs ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_worklogs",
    {
      description:
        "List worklogs from Tempo. Filter by date range, project or issue. " +
        "Returns time entries logged by users in your Jira Cloud instance.",
      inputSchema: z.object({
        from: dateString.describe("Start date (YYYY-MM-DD)"),
        to: dateString.describe("End date (YYYY-MM-DD)"),
        projectId: z
          .string()
          .optional()
          .describe("Jira project ID to filter worklogs"),
        issueId: z
          .number()
          .optional()
          .describe("Jira issue ID (integer) to filter worklogs"),
        limit: z
          .number()
          .min(1)
          .max(5000)
          .default(50)
          .describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<PaginatedResponse<unknown>>("/worklogs", {
          from: input.from,
          to: input.to,
          projectId: input.projectId,
          issueId: input.issueId,
          limit: input.limit,
          offset: input.offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── get_user_worklogs ───────────────────────────────────────────────────────
  server.registerTool(
    "get_user_worklogs",
    {
      description:
        "Get all worklogs for a specific user by their Jira accountId. " +
        "Use this to retrieve the time entries logged by one person.",
      inputSchema: z.object({
        accountId: z.string().describe("Jira user accountId"),
        from: dateString.optional().describe("Start date (YYYY-MM-DD)"),
        to: dateString.optional().describe("End date (YYYY-MM-DD)"),
        limit: z.number().min(1).max(5000).default(50).describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<PaginatedResponse<unknown>>(
          `/worklogs/user/${encodeURIComponent(input.accountId)}`,
          { from: input.from, to: input.to, limit: input.limit, offset: input.offset }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── create_worklog ──────────────────────────────────────────────────────────
  server.registerTool(
    "create_worklog",
    {
      description:
        "Create a new worklog (time entry) in Tempo. " +
        "Requires the Jira issueId (integer, not the key like PROJ-123). " +
        "Use the 'attributes' field to set custom work attributes such as " +
        "_Account_ (billing account). Call get_work_attributes first to discover valid keys.",
      inputSchema: z.object({
        authorAccountId: z.string().describe("Jira accountId of the user logging time"),
        issueId: z.number().describe("Jira issue ID (integer — not the issue key)"),
        startDate: dateString.describe("Date of the work (YYYY-MM-DD)"),
        startTime: z
          .string()
          .optional()
          .describe("Start time (HH:mm:ss), e.g. '09:00:00'"),
        timeSpentSeconds: z.number().describe("Time spent in seconds, e.g. 3600 for 1h"),
        billableSeconds: z
          .number()
          .optional()
          .describe("Billable time in seconds (defaults to timeSpentSeconds)"),
        description: z.string().optional().describe("Description of the work done"),
        attributes: z
          .array(
            z.object({
              key: z.string().describe("Attribute key, e.g. '_Account_'"),
              value: z.string().describe("Attribute value, e.g. '510119'"),
            })
          )
          .optional()
          .describe(
            "Custom work attributes, e.g. [{\"key\": \"_Account_\", \"value\": \"510119\"}]. " +
            "Required when your Tempo configuration mandates an account on worklogs."
          ),
      }),
    },
    async (input) => {
      try {
        const data = await tempoPost<unknown>("/worklogs", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── update_worklog ──────────────────────────────────────────────────────────
  server.registerTool(
    "update_worklog",
    {
      description:
        "Update an existing worklog by its Tempo worklog ID. " +
        "Tempo requires authorAccountId, issueId, startDate and timeSpentSeconds even when updating — always provide them.",
      inputSchema: z.object({
        worklogId: z.string().describe("Tempo worklog ID"),
        authorAccountId: z.string().describe("Jira accountId of the worklog author (required by Tempo even on update)"),
        issueId: z.number().describe("Jira issue ID (integer)"),
        startDate: dateString.describe("Date of the work (YYYY-MM-DD)"),
        timeSpentSeconds: z.number().describe("Time spent in seconds"),
        startTime: z.string().optional().describe("Start time (HH:mm:ss)"),
        billableSeconds: z.number().optional().describe("Billable seconds"),
        description: z.string().optional().describe("New description"),
        attributes: z
          .array(
            z.object({
              key: z.string().describe("Attribute key, e.g. '_Account_'"),
              value: z.string().describe("Attribute value, e.g. '510119'"),
            })
          )
          .optional()
          .describe("Custom work attributes, e.g. [{\"key\": \"_Account_\", \"value\": \"510119\"}]"),
      }),
    },
    async ({ worklogId, ...rest }) => {
      try {
        const data = await tempoPut<unknown>(`/worklogs/${encodeURIComponent(worklogId)}`, rest);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── delete_worklog ──────────────────────────────────────────────────────────
  server.registerTool(
    "delete_worklog",
    {
      description: "Delete a worklog from Tempo by its ID. This action is irreversible.",
      inputSchema: z.object({
        worklogId: z.string().describe("Tempo worklog ID to delete"),
      }),
    },
    async (input) => {
      try {
        await tempoDelete(`/worklogs/${encodeURIComponent(input.worklogId)}`);
        return { content: [{ type: "text", text: `Worklog ${input.worklogId} deleted.` }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── get_timesheet_status ────────────────────────────────────────────────────
  server.registerTool(
    "get_timesheet_status",
    {
      description:
        "Get the timesheet approval status for a user over a given period. " +
        "Shows whether their timesheet is open, submitted, or approved. " +
        "The period must be a complete Tempo approval period (e.g. first to last day of a month: from '2026-05-01' to '2026-05-31').",
      inputSchema: z.object({
        accountId: z.string().describe("Jira user accountId"),
        from: dateString.describe("Period start date — first day of the month (YYYY-MM-DD)"),
        to: dateString.describe("Period end date — last day of the month (YYYY-MM-DD)"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<unknown>(
          `/timesheet-approvals/user/${encodeURIComponent(input.accountId)}`,
          { from: input.from, to: input.to }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── submit_timesheet ────────────────────────────────────────────────────────
  server.registerTool(
    "submit_timesheet",
    {
      description:
        "Submit a user's timesheet for approval over a given period. " +
        "The user must have logged time before submitting.",
      inputSchema: z.object({
        accountId: z.string().describe("Jira user accountId"),
        from: dateString.describe("Period start date (YYYY-MM-DD)"),
        to: dateString.describe("Period end date (YYYY-MM-DD)"),
        comment: z.string().optional().describe("Optional submission comment"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoPost<unknown>(
          `/timesheet-approvals/user/${encodeURIComponent(input.accountId)}/submit`,
          { from: input.from, to: input.to, comment: input.comment }
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── get_work_attributes ─────────────────────────────────────────────────────
  server.registerTool(
    "get_work_attributes",
    {
      description:
        "List all custom work attributes configured in Tempo (e.g. work type, billing category). " +
        "Useful to know valid attribute keys before creating worklogs.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await tempoGet<unknown>("/work-attributes");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  // ─── search_accounts ─────────────────────────────────────────────────────────
  server.registerTool(
    "search_accounts",
    {
      description:
        "Search for Tempo accounts (billing accounts / cost centres). " +
        "Use this to find the account key needed when logging time with an _Account_ attribute.",
      inputSchema: z.object({
        query: z.string().optional().describe("Search term (name or key)"),
        limit: z.number().min(1).max(5000).default(50).describe("Maximum number of results (max 5000)"),
        offset: z.number().min(0).default(0).describe("Pagination offset"),
      }),
    },
    async (input) => {
      try {
        const data = await tempoGet<unknown>("/accounts", {
          query: input.query,
          limit: input.limit,
          offset: input.offset,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );
}
