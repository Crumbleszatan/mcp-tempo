import { ToolDefinition, objectSchema, str, num, arr, strEnum, bool } from "./types.js";

export const roleTools: ToolDefinition[] = [
  // --- Roles ---
  {
    name: "tempo_list_roles",
    description: "Retrieve all roles.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/roles" }),
  },
  {
    name: "tempo_create_role",
    description: "Create a new role.",
    inputSchema: objectSchema(
      { name: str("Role name"), default: bool("Set as default role") },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/roles", body: args }),
  },
  {
    name: "tempo_get_default_role",
    description: "Retrieve the default role.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/roles/default" }),
  },
  {
    name: "tempo_get_role",
    description: "Retrieve a specific role.",
    inputSchema: objectSchema({ id: str("Role ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/roles/${args.id}` }),
  },
  {
    name: "tempo_update_role",
    description: "Update a role.",
    inputSchema: objectSchema(
      { id: str("Role ID"), name: str("Role name") },
      ["id", "name"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/roles/${id}`, body });
    },
  },
  {
    name: "tempo_delete_role",
    description: "Delete a role.",
    inputSchema: objectSchema({ id: str("Role ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/roles/${args.id}` }),
  },
  // --- Permission Roles ---
  {
    name: "tempo_list_permission_roles",
    description: "Retrieve permission roles with optional team filter.",
    inputSchema: objectSchema({
      teamId: num("Filter by team ID"),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/permission-roles",
        query: { teamId: args.teamId as number, offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_create_permission_role",
    description: "Create a permission role.",
    inputSchema: objectSchema(
      {
        name: str("Permission role name"),
        permissions: arr("Permission keys", { type: "string" }),
        accessType: strEnum("Access type", ["TEAM", "GLOBAL"]),
        accessEntityIds: arr("Entity IDs for TEAM access", { type: "number" }),
      },
      ["name", "permissions", "accessType"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/permission-roles", body: args }),
  },
  {
    name: "tempo_get_global_permission_roles",
    description: "Retrieve global permission roles.",
    inputSchema: objectSchema({
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/permission-roles/global",
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_get_permission_role",
    description: "Retrieve a specific permission role.",
    inputSchema: objectSchema({ id: str("Permission role ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/permission-roles/${args.id}` }),
  },
  {
    name: "tempo_update_permission_role",
    description: "Update a permission role.",
    inputSchema: objectSchema(
      {
        id: str("Permission role ID"),
        name: str("Permission role name"),
        permissions: arr("Permission keys"),
        accessType: strEnum("Access type", ["TEAM", "GLOBAL"]),
      },
      ["id", "name", "permissions", "accessType"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/permission-roles/${id}`, body });
    },
  },
  {
    name: "tempo_delete_permission_role",
    description: "Delete a permission role.",
    inputSchema: objectSchema({ id: str("Permission role ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/permission-roles/${args.id}` }),
  },
];
