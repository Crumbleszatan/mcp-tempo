import { z } from "zod";
import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const workloadSchemeTools: ToolDefinition[] = [
  {
    name: "tempo_list_workload_schemes",
    description: "Retrieve all workload schemes (defines working hours per day).",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/workload-schemes" }),
  },
  {
    name: "tempo_create_workload_scheme",
    description: "Create a new workload scheme.",
    inputSchema: objectSchema(
      {
        name: str("Scheme name"),
        description: str("Scheme description"),
        days: z.record(z.string(), z.number()).describe("Working hours per day (keys: MONDAY-SUNDAY, values: seconds)"),
      },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/workload-schemes", body: args }),
  },
  {
    name: "tempo_get_workload_scheme",
    description: "Retrieve a specific workload scheme.",
    inputSchema: objectSchema({ id: str("Workload scheme ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/workload-schemes/${args.id}` }),
  },
  {
    name: "tempo_update_workload_scheme",
    description: "Update a workload scheme.",
    inputSchema: objectSchema(
      {
        id: str("Workload scheme ID"),
        name: str("Scheme name"),
        description: str("Scheme description"),
        days: z.record(z.string(), z.number()).describe("Working hours per day"),
      },
      ["id", "name"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/workload-schemes/${id}`, body });
    },
  },
  {
    name: "tempo_delete_workload_scheme",
    description: "Delete a workload scheme.",
    inputSchema: objectSchema({ id: str("Workload scheme ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/workload-schemes/${args.id}` }),
  },
  {
    name: "tempo_set_default_workload_scheme",
    description: "Set a workload scheme as the default.",
    inputSchema: objectSchema({ id: str("Workload scheme ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "PUT", path: `/4/workload-schemes/${args.id}/default` }),
  },
  {
    name: "tempo_get_workload_scheme_members",
    description: "Retrieve members of a workload scheme.",
    inputSchema: objectSchema(
      {
        id: str("Workload scheme ID"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["id"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/workload-schemes/${args.id}/members`,
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_add_workload_scheme_members",
    description: "Add users to a workload scheme.",
    inputSchema: objectSchema(
      {
        id: str("Workload scheme ID"),
        accountIds: arr("Atlassian account IDs"),
      },
      ["id", "accountIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: `/4/workload-schemes/${args.id}/members`,
        body: { accountIds: args.accountIds },
      }),
  },
  {
    name: "tempo_search_workload_scheme_members",
    description: "Search members across workload schemes.",
    inputSchema: objectSchema({
      schemeIds: arr("Workload scheme IDs", { type: "number" }),
      accountIds: arr("Atlassian account IDs"),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/workload-schemes/members/search", body: args }),
  },
  {
    name: "tempo_get_user_workload_scheme",
    description: "Retrieve the workload scheme for a user.",
    inputSchema: objectSchema({ accountId: str("Atlassian account ID") }, ["accountId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/workload-schemes/users/${args.accountId}` }),
  },
];
