import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const reportTools: ToolDefinition[] = [
  {
    name: "tempo_list_reports",
    description: "List all costs and revenues reports.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/reports/costs-and-revenues" }),
  },
  {
    name: "tempo_create_report",
    description: "Create a costs and revenues report.",
    inputSchema: objectSchema(
      {
        name: str("Report name"),
        projectIds: arr("Project IDs to include", { type: "number" }),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
      },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/reports/costs-and-revenues", body: args }),
  },
  {
    name: "tempo_get_report",
    description: "Get a specific report.",
    inputSchema: objectSchema({ reportId: str("Report ID") }, ["reportId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/reports/costs-and-revenues/${args.reportId}` }),
  },
  {
    name: "tempo_delete_report",
    description: "Delete a report.",
    inputSchema: objectSchema({ reportId: str("Report ID") }, ["reportId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/reports/costs-and-revenues/${args.reportId}` }),
  },
  {
    name: "tempo_get_report_data",
    description: "Get generated data for a report.",
    inputSchema: objectSchema({ reportId: str("Report ID") }, ["reportId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/reports/costs-and-revenues/${args.reportId}/data` }),
  },
];
