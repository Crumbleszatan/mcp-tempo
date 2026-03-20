import { ToolDefinition, objectSchema, str } from "./types.js";

export const periodTools: ToolDefinition[] = [
  {
    name: "tempo_get_periods",
    description: "Retrieve approval periods within a date range.",
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
        path: "/4/periods",
        query: { from: args.from as string, to: args.to as string },
      }),
  },
];
