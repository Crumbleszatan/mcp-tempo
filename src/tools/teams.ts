import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const teamTools: ToolDefinition[] = [
  {
    name: "tempo_list_teams",
    description: "Retrieve all teams.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/teams" }),
  },
  {
    name: "tempo_create_team",
    description: "Create a new team.",
    inputSchema: objectSchema(
      {
        name: str("Team name"),
        leadAccountId: str("Lead Atlassian account ID"),
        summary: str("Team summary/description"),
        programId: num("Program ID to associate"),
        memberIds: arr("Initial member Atlassian account IDs"),
      },
      ["name", "leadAccountId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/teams", body: args }),
  },
  {
    name: "tempo_get_team",
    description: "Retrieve a specific team.",
    inputSchema: objectSchema({ id: str("Team ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/teams/${args.id}` }),
  },
  {
    name: "tempo_update_team",
    description: "Update a team.",
    inputSchema: objectSchema(
      {
        id: str("Team ID"),
        name: str("Team name"),
        leadAccountId: str("Lead Atlassian account ID"),
        summary: str("Team summary"),
        programId: num("Program ID"),
      },
      ["id", "name", "leadAccountId"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/teams/${id}`, body });
    },
  },
  {
    name: "tempo_delete_team",
    description: "Delete a team.",
    inputSchema: objectSchema({ id: str("Team ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/teams/${args.id}` }),
  },
  {
    name: "tempo_get_team_links",
    description: "Retrieve links for a team (project associations).",
    inputSchema: objectSchema({ id: str("Team ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/teams/${args.id}/links` }),
  },
  {
    name: "tempo_get_team_members",
    description: "Retrieve active members of a team.",
    inputSchema: objectSchema({ id: str("Team ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/teams/${args.id}/members` }),
  },
  // --- Team Links ---
  {
    name: "tempo_create_team_link",
    description: "Link a team to a project scope.",
    inputSchema: objectSchema(
      {
        teamId: num("Team ID"),
        scopeId: num("Scope ID (e.g., Jira project ID)"),
        scopeType: str("Scope type (e.g., PROJECT)"),
      },
      ["teamId", "scopeId", "scopeType"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/team-links", body: args }),
  },
  {
    name: "tempo_get_team_link",
    description: "Retrieve a specific team link.",
    inputSchema: objectSchema({ linkId: str("Team link ID") }, ["linkId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/team-links/${args.linkId}` }),
  },
  {
    name: "tempo_delete_team_link",
    description: "Delete a team link.",
    inputSchema: objectSchema({ linkId: str("Team link ID") }, ["linkId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/team-links/${args.linkId}` }),
  },
  {
    name: "tempo_get_team_link_by_project",
    description: "Retrieve team link for a project.",
    inputSchema: objectSchema({ projectId: str("Jira project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/team-links/project/${args.projectId}` }),
  },
  // --- Team Memberships ---
  {
    name: "tempo_create_team_membership",
    description: "Create a team membership.",
    inputSchema: objectSchema(
      {
        teamId: num("Team ID"),
        accountId: str("Atlassian account ID"),
        roleId: num("Role ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        commitmentPercent: num("Commitment percentage (0-100)"),
      },
      ["teamId", "accountId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/team-memberships", body: args }),
  },
  {
    name: "tempo_search_team_memberships",
    description: "Search team memberships with filters.",
    inputSchema: objectSchema({
      teamIds: arr("Team IDs", { type: "number" }),
      accountIds: arr("Account IDs"),
      roleIds: arr("Role IDs", { type: "number" }),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/team-memberships/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
  {
    name: "tempo_get_team_memberships",
    description: "Retrieve all memberships for a team.",
    inputSchema: objectSchema({ teamId: str("Team ID") }, ["teamId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/team-memberships/team/${args.teamId}` }),
  },
  {
    name: "tempo_get_team_membership",
    description: "Retrieve a specific membership.",
    inputSchema: objectSchema({ id: str("Membership ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/team-memberships/${args.id}` }),
  },
  {
    name: "tempo_update_team_membership",
    description: "Update a team membership.",
    inputSchema: objectSchema(
      {
        id: str("Membership ID"),
        teamId: num("Team ID"),
        accountId: str("Atlassian account ID"),
        roleId: num("Role ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        commitmentPercent: num("Commitment percentage"),
      },
      ["id"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/team-memberships/${id}`, body });
    },
  },
  {
    name: "tempo_delete_team_membership",
    description: "Delete a team membership.",
    inputSchema: objectSchema({ id: str("Membership ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/team-memberships/${args.id}` }),
  },
  // --- Generic Resource Team Members ---
  {
    name: "tempo_get_team_generic_resources",
    description: "Retrieve generic resources for a team.",
    inputSchema: objectSchema({ teamId: str("Team ID") }, ["teamId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/teams/${args.teamId}/generic-resources` }),
  },
  {
    name: "tempo_add_generic_resource_to_team",
    description: "Add a generic resource to a team.",
    inputSchema: objectSchema(
      {
        teamId: str("Team ID"),
        genericResourceId: num("Generic resource ID"),
        roleId: num("Role ID"),
        commitmentPercent: num("Commitment percentage"),
      },
      ["teamId", "genericResourceId"]
    ),
    handler: async (client, args) => {
      const { teamId, ...body } = args;
      return client.request({ method: "POST", path: `/4/teams/${teamId}/generic-resources`, body });
    },
  },
  {
    name: "tempo_get_team_generic_resource",
    description: "Retrieve a generic resource for a team.",
    inputSchema: objectSchema(
      { teamId: str("Team ID"), resourceId: str("Resource ID") },
      ["teamId", "resourceId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/teams/${args.teamId}/generic-resources/${args.resourceId}` }),
  },
  {
    name: "tempo_remove_generic_resource_from_team",
    description: "Remove a generic resource from a team.",
    inputSchema: objectSchema(
      { teamId: str("Team ID"), resourceId: str("Resource ID") },
      ["teamId", "resourceId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/teams/${args.teamId}/generic-resources/${args.resourceId}` }),
  },
];
