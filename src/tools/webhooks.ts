import { ToolDefinition, objectSchema, str, arr } from "./types.js";

export const webhookTools: ToolDefinition[] = [
  {
    name: "tempo_list_webhook_subscriptions",
    description: "Retrieve all webhook subscriptions.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/webhooks/subscriptions" }),
  },
  {
    name: "tempo_create_webhook_subscription",
    description: "Create a webhook subscription to receive event notifications.",
    inputSchema: objectSchema(
      {
        url: str("Webhook callback URL"),
        events: arr(
          "Events to subscribe to (e.g., worklog_created, worklog_updated, worklog_deleted, plan_created, plan_updated, plan_deleted)"
        ),
      },
      ["url", "events"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/webhooks/subscriptions", body: args }),
  },
  {
    name: "tempo_get_webhook_subscription",
    description: "Retrieve a specific webhook subscription.",
    inputSchema: objectSchema({ id: str("Subscription ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/webhooks/subscriptions/${args.id}` }),
  },
  {
    name: "tempo_delete_webhook_subscription",
    description: "Delete a webhook subscription.",
    inputSchema: objectSchema({ id: str("Subscription ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/webhooks/subscriptions/${args.id}` }),
  },
  {
    name: "tempo_refresh_webhook_subscription",
    description: "Refresh an inactive webhook subscription.",
    inputSchema: objectSchema({ id: str("Subscription ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "PATCH", path: `/4/webhooks/subscriptions/${args.id}/refresh` }),
  },
];
