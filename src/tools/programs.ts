import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const programTools: ToolDefinition[] = [
  {
    name: "tempo_list_programs",
    description: "Retrieve all programs.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/programs" }),
  },
  {
    name: "tempo_create_program",
    description: "Create a new program.",
    inputSchema: objectSchema(
      {
        name: str("Program name"),
        managerAccountId: str("Manager Atlassian account ID"),
        teamIds: arr("Team IDs to include", { type: "number" }),
      },
      ["name", "managerAccountId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/programs", body: args }),
  },
  {
    name: "tempo_get_program",
    description: "Retrieve a specific program.",
    inputSchema: objectSchema({ id: str("Program ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/programs/${args.id}` }),
  },
  {
    name: "tempo_update_program",
    description: "Update a program.",
    inputSchema: objectSchema(
      {
        id: str("Program ID"),
        name: str("Program name"),
        managerAccountId: str("Manager account ID"),
        teamIds: arr("Team IDs", { type: "number" }),
      },
      ["id", "name", "managerAccountId"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/programs/${id}`, body });
    },
  },
  {
    name: "tempo_delete_program",
    description: "Delete a program.",
    inputSchema: objectSchema({ id: str("Program ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/programs/${args.id}` }),
  },
  {
    name: "tempo_get_program_teams",
    description: "Retrieve teams belonging to a program.",
    inputSchema: objectSchema({ id: str("Program ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/programs/${args.id}/teams` }),
  },
];
