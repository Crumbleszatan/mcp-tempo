import { ToolDefinition, objectSchema, str, num, arr, strEnum } from "./types.js";

export const skillTools: ToolDefinition[] = [
  // --- Skills ---
  {
    name: "tempo_list_skills",
    description: "Retrieve all skills.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/skills" }),
  },
  {
    name: "tempo_create_skill",
    description: "Create a new skill.",
    inputSchema: objectSchema({ name: str("Skill name") }, ["name"]),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/skills", body: args }),
  },
  {
    name: "tempo_get_skill",
    description: "Retrieve a specific skill.",
    inputSchema: objectSchema({ id: str("Skill ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/skills/${args.id}` }),
  },
  {
    name: "tempo_update_skill",
    description: "Update a skill.",
    inputSchema: objectSchema(
      { id: str("Skill ID"), name: str("Skill name") },
      ["id", "name"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/skills/${id}`, body });
    },
  },
  {
    name: "tempo_delete_skill",
    description: "Delete a skill.",
    inputSchema: objectSchema({ id: str("Skill ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/skills/${args.id}` }),
  },
  // --- Skill Assignments ---
  {
    name: "tempo_assign_skills",
    description: "Assign skills to a resource (user or generic resource).",
    inputSchema: objectSchema(
      {
        assigneeId: str("Assignee ID (account ID or generic resource ID)"),
        assigneeType: strEnum("Assignee type", ["USER", "GENERIC"]),
        skillIds: arr("Skill IDs to assign", { type: "number" }),
      },
      ["assigneeId", "assigneeType", "skillIds"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/skill-assignments", body: args }),
  },
  {
    name: "tempo_replace_skills",
    description: "Replace all skills for a resource.",
    inputSchema: objectSchema(
      {
        assigneeId: str("Assignee ID"),
        assigneeType: strEnum("Assignee type", ["USER", "GENERIC"]),
        skillIds: arr("Skill IDs to set", { type: "number" }),
      },
      ["assigneeId", "assigneeType", "skillIds"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/skill-assignments/replace", body: args }),
  },
  {
    name: "tempo_search_skill_assignments",
    description: "Search skill assignments across resources.",
    inputSchema: objectSchema({
      assigneeIds: arr("Assignee IDs"),
      assigneeTypes: arr("Assignee types"),
      skillIds: arr("Skill IDs", { type: "number" }),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/skill-assignments/search", body: args }),
  },
  {
    name: "tempo_get_skill_assignments",
    description: "Retrieve skill assignments for a specific resource.",
    inputSchema: objectSchema(
      {
        assigneeId: str("Assignee ID"),
        assigneeType: strEnum("Assignee type", ["USER", "GENERIC"]),
      },
      ["assigneeId", "assigneeType"]
    ),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/skill-assignments/${args.assigneeId}/${args.assigneeType}` }),
  },
  {
    name: "tempo_delete_skill_assignment",
    description: "Remove a skill from a resource.",
    inputSchema: objectSchema(
      {
        assigneeId: str("Assignee ID"),
        assigneeType: strEnum("Assignee type", ["USER", "GENERIC"]),
        skillId: str("Skill ID to remove"),
      },
      ["assigneeId", "assigneeType", "skillId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/skill-assignments/${args.assigneeId}/${args.assigneeType}/${args.skillId}`,
      }),
  },
];
