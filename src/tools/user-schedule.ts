import { ToolDefinition, objectSchema, str } from "./types.js";

export const userScheduleTools: ToolDefinition[] = [
  {
    name: "tempo_get_my_schedule",
    description: "Retrieve the schedule (working days/hours) for the authenticated user.",
    inputSchema: objectSchema(
      {
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
      },
      ["from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/user-schedule",
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_get_user_schedule",
    description: "Retrieve the schedule for a specific user.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
      },
      ["accountId", "from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/user-schedule/${args.accountId}`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
];
