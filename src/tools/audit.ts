import { ToolDefinition, objectSchema, str, arr } from "./types.js";

export const auditTools: ToolDefinition[] = [
  {
    name: "tempo_search_audit_logs",
    description: "Search audit logs for changes across Tempo resources.",
    inputSchema: objectSchema({
      entityTypes: arr("Entity types to filter (e.g., WORKLOG, PLAN, ACCOUNT)"),
      eventTypes: arr("Event types (e.g., CREATED, UPDATED, DELETED)"),
      authorAccountIds: arr("Filter by author account IDs"),
      from: str("Start date (YYYY-MM-DD)"),
      to: str("End date (YYYY-MM-DD)"),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/papertrail/search", body: args }),
  },
  {
    name: "tempo_get_deleted_worklog_audit",
    description: "Retrieve audit events for deleted worklogs (deprecated, prefer search_audit_logs).",
    inputSchema: objectSchema({
      from: str("Start date"),
      to: str("End date"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/papertrail/1/events/deleted/types/worklog",
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_get_deleted_allocation_audit",
    description: "Retrieve audit events for deleted allocations/plans (deprecated, prefer search_audit_logs).",
    inputSchema: objectSchema({
      from: str("Start date"),
      to: str("End date"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/papertrail/1/events/deleted/types/allocation",
        query: { from: args.from as string, to: args.to as string },
      }),
  },
];
