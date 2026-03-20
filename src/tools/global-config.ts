import { ToolDefinition, objectSchema, str, strEnum, num, arr } from "./types.js";

export const globalConfigTools: ToolDefinition[] = [
  {
    name: "tempo_get_global_configuration",
    description: "Retrieve Tempo global configuration settings.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/globalconfiguration" }),
  },
  // --- Global Rates ---
  {
    name: "tempo_get_global_rates_by_role",
    description: "List global rates for all or a specific role.",
    inputSchema: objectSchema(
      {
        rateType: strEnum("Rate type", ["COST", "BILLING"]),
        roleId: num("Optional role ID to filter"),
      },
      ["rateType"]
    ),
    handler: async (client, args) => {
      const path = args.roleId
        ? `/4/global-rates/by-role/${args.roleId}`
        : "/4/global-rates/by-role";
      return client.request({
        method: "GET",
        path,
        query: { rateType: args.rateType as string },
      });
    },
  },
  {
    name: "tempo_set_global_cost_rates_by_role",
    description: "Set global cost rates by role in bulk.",
    inputSchema: objectSchema(
      {
        rates: arr("Array of role rate inputs", {
          type: "object",
          properties: {
            roleId: { type: "number", description: "Role ID" },
            amount: { type: "number", description: "Rate amount" },
          },
          required: ["roleId", "amount"],
        }),
      },
      ["rates"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: "/4/global-rates/cost/by-role",
        body: { rates: args.rates },
      }),
  },
  // --- Flex Plans ---
  {
    name: "tempo_create_flex_plan",
    description: "Create a flex plan (flexible time-off policy).",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        startDate: str("Plan start date (YYYY-MM-DD)"),
        targetHours: num("Target hours"),
        policyId: num("Policy ID"),
      },
      ["accountId", "startDate", "targetHours"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/flex-plans", body: args }),
  },
  {
    name: "tempo_search_flex_plans",
    description: "Search flex plans.",
    inputSchema: objectSchema({
      accountIds: arr("Account IDs"),
      from: str("Start date"),
      to: str("End date"),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/flex-plans/search", body: args }),
  },
  {
    name: "tempo_get_flex_plan",
    description: "Get a specific flex plan.",
    inputSchema: objectSchema({ id: str("Flex plan ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/flex-plans/${args.id}` }),
  },
  {
    name: "tempo_update_flex_plan",
    description: "Update a flex plan.",
    inputSchema: objectSchema(
      {
        id: str("Flex plan ID"),
        accountId: str("Account ID"),
        startDate: str("Start date"),
        targetHours: num("Target hours"),
      },
      ["id"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/flex-plans/${id}`, body });
    },
  },
  {
    name: "tempo_delete_flex_plan",
    description: "Delete a flex plan.",
    inputSchema: objectSchema({ id: str("Flex plan ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/flex-plans/${args.id}` }),
  },
];
