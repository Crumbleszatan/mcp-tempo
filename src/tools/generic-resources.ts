import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const genericResourceTools: ToolDefinition[] = [
  {
    name: "tempo_create_generic_resource",
    description: "Create a generic (placeholder) resource for planning.",
    inputSchema: objectSchema(
      { name: str("Resource name") },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/generic-resources", body: args }),
  },
  {
    name: "tempo_search_generic_resources",
    description: "Search generic resources.",
    inputSchema: objectSchema({
      ids: arr("Resource IDs", { type: "number" }),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/generic-resources/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
  {
    name: "tempo_get_generic_resource",
    description: "Retrieve a specific generic resource.",
    inputSchema: objectSchema({ id: str("Generic resource ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/generic-resources/${args.id}` }),
  },
  {
    name: "tempo_update_generic_resource",
    description: "Update a generic resource.",
    inputSchema: objectSchema(
      { id: str("Generic resource ID"), name: str("Resource name") },
      ["id", "name"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/generic-resources/${id}`, body });
    },
  },
  {
    name: "tempo_delete_generic_resource",
    description: "Delete a generic resource.",
    inputSchema: objectSchema({ id: str("Generic resource ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/generic-resources/${args.id}` }),
  },
];
