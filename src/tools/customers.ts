import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const customerTools: ToolDefinition[] = [
  {
    name: "tempo_list_customers",
    description: "Retrieve all customers.",
    inputSchema: objectSchema({
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
      id: arr("Filter by customer IDs", { type: "number" }),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/customers",
        query: { offset: args.offset as number, limit: args.limit as number, id: args.id as string[] },
      }),
  },
  {
    name: "tempo_create_customer",
    description: "Create a new customer.",
    inputSchema: objectSchema(
      { key: str("Unique customer key"), name: str("Customer name") },
      ["key", "name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/customers", body: args }),
  },
  {
    name: "tempo_search_customers",
    description: "Search customers with filters.",
    inputSchema: objectSchema({
      keys: arr("Customer keys"),
      ids: arr("Customer IDs", { type: "number" }),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/customers/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
  {
    name: "tempo_get_customer",
    description: "Retrieve a specific customer by ID.",
    inputSchema: objectSchema({ id: str("Customer ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/customers/${args.id}` }),
  },
  {
    name: "tempo_get_customer_accounts",
    description: "Retrieve accounts for a specific customer.",
    inputSchema: objectSchema(
      {
        id: str("Customer ID"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["id"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/customers/${args.id}/accounts`,
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_update_customer",
    description: "Update a customer.",
    inputSchema: objectSchema(
      { key: str("Customer key"), name: str("Customer name") },
      ["key", "name"]
    ),
    handler: async (client, args) => {
      const { key, ...body } = args;
      return client.request({ method: "PUT", path: `/4/customers/${key}`, body: { key, ...body } });
    },
  },
  {
    name: "tempo_delete_customer",
    description: "Delete a customer.",
    inputSchema: objectSchema({ key: str("Customer key") }, ["key"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/customers/${args.key}` }),
  },
];
