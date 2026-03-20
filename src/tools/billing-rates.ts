import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const billingRateTools: ToolDefinition[] = [
  {
    name: "tempo_list_billing_rates_tables",
    description: "List all billing rates tables.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/billing-rates-tables" }),
  },
  {
    name: "tempo_create_billing_rates_table",
    description: "Create a billing rates table.",
    inputSchema: objectSchema(
      {
        name: str("Table name"),
        defaultRate: num("Default rate"),
      },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/billing-rates-tables", body: args }),
  },
  {
    name: "tempo_get_billing_rates_table",
    description: "Get a specific billing rates table.",
    inputSchema: objectSchema({ billingRatesTableId: str("Table ID") }, ["billingRatesTableId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/billing-rates-tables/${args.billingRatesTableId}` }),
  },
  {
    name: "tempo_delete_billing_rates_table",
    description: "Delete a billing rates table.",
    inputSchema: objectSchema({ billingRatesTableId: str("Table ID") }, ["billingRatesTableId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/billing-rates-tables/${args.billingRatesTableId}` }),
  },
  {
    name: "tempo_set_billing_rates_table_account",
    description: "Set a billing rates table for an account.",
    inputSchema: objectSchema(
      {
        billingRatesTableId: str("Table ID"),
        accountId: num("Account ID"),
      },
      ["billingRatesTableId", "accountId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/billing-rates-tables/${args.billingRatesTableId}/account`,
        body: { accountId: args.accountId },
      }),
  },
  {
    name: "tempo_set_billing_rates_table_rates",
    description: "Set role rates in a billing rates table.",
    inputSchema: objectSchema(
      {
        billingRatesTableId: str("Table ID"),
        rates: arr("Role rates", {
          type: "object",
          properties: {
            roleId: { type: "number", description: "Role ID" },
            amount: { type: "number", description: "Rate amount" },
          },
          required: ["roleId", "amount"],
        }),
      },
      ["billingRatesTableId", "rates"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/billing-rates-tables/${args.billingRatesTableId}/rates`,
        body: { rates: args.rates },
      }),
  },
];
