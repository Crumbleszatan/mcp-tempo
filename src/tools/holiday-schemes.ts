import { ToolDefinition, objectSchema, str, num, arr, bool } from "./types.js";

export const holidaySchemeTools: ToolDefinition[] = [
  {
    name: "tempo_list_holiday_schemes",
    description: "Retrieve all holiday schemes.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/holiday-schemes" }),
  },
  {
    name: "tempo_create_holiday_scheme",
    description: "Create a new holiday scheme.",
    inputSchema: objectSchema(
      {
        name: str("Scheme name"),
        description: str("Scheme description"),
      },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/holiday-schemes", body: args }),
  },
  {
    name: "tempo_get_holiday_scheme",
    description: "Retrieve a specific holiday scheme.",
    inputSchema: objectSchema({ schemeId: str("Holiday scheme ID") }, ["schemeId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/holiday-schemes/${args.schemeId}` }),
  },
  {
    name: "tempo_update_holiday_scheme",
    description: "Update a holiday scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        name: str("Scheme name"),
        description: str("Scheme description"),
      },
      ["schemeId", "name"]
    ),
    handler: async (client, args) => {
      const { schemeId, ...body } = args;
      return client.request({ method: "PUT", path: `/4/holiday-schemes/${schemeId}`, body });
    },
  },
  {
    name: "tempo_delete_holiday_scheme",
    description: "Delete a holiday scheme.",
    inputSchema: objectSchema({ schemeId: str("Holiday scheme ID") }, ["schemeId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/holiday-schemes/${args.schemeId}` }),
  },
  {
    name: "tempo_set_default_holiday_scheme",
    description: "Set a holiday scheme as the default.",
    inputSchema: objectSchema({ schemeId: str("Holiday scheme ID") }, ["schemeId"]),
    handler: async (client, args) =>
      client.request({ method: "PUT", path: `/4/holiday-schemes/${args.schemeId}/default` }),
  },
  {
    name: "tempo_list_holidays",
    description: "Retrieve holidays in a scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        year: num("Year to filter by"),
      },
      ["schemeId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/holiday-schemes/${args.schemeId}/holidays`,
        query: { year: args.year as number },
      }),
  },
  {
    name: "tempo_create_holiday",
    description: "Add a holiday to a scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        name: str("Holiday name"),
        date: str("Holiday date (YYYY-MM-DD)"),
        durationSeconds: num("Duration in seconds"),
        description: str("Holiday description"),
        type: str("Holiday type (FIXED or FLOATING)"),
      },
      ["schemeId", "name", "date", "durationSeconds"]
    ),
    handler: async (client, args) => {
      const { schemeId, ...body } = args;
      return client.request({ method: "POST", path: `/4/holiday-schemes/${schemeId}/holidays`, body });
    },
  },
  {
    name: "tempo_get_floating_holidays",
    description: "Retrieve floating holidays in a scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        year: num("Year to filter by"),
      },
      ["schemeId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/holiday-schemes/${args.schemeId}/holidays/floating`,
        query: { year: args.year as number },
      }),
  },
  {
    name: "tempo_get_holiday",
    description: "Retrieve a specific holiday.",
    inputSchema: objectSchema(
      { schemeId: str("Holiday scheme ID"), holidayId: str("Holiday ID") },
      ["schemeId", "holidayId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/holiday-schemes/${args.schemeId}/holidays/${args.holidayId}` }),
  },
  {
    name: "tempo_update_holiday",
    description: "Update a holiday in a scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        holidayId: str("Holiday ID"),
        name: str("Holiday name"),
        date: str("Holiday date (YYYY-MM-DD)"),
        durationSeconds: num("Duration in seconds"),
        description: str("Holiday description"),
      },
      ["schemeId", "holidayId", "name", "date", "durationSeconds"]
    ),
    handler: async (client, args) => {
      const { schemeId, holidayId, ...body } = args;
      return client.request({ method: "PUT", path: `/4/holiday-schemes/${schemeId}/holidays/${holidayId}`, body });
    },
  },
  {
    name: "tempo_delete_holiday",
    description: "Delete a holiday from a scheme.",
    inputSchema: objectSchema(
      { schemeId: str("Holiday scheme ID"), holidayId: str("Holiday ID") },
      ["schemeId", "holidayId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/holiday-schemes/${args.schemeId}/holidays/${args.holidayId}` }),
  },
  {
    name: "tempo_get_holiday_scheme_members",
    description: "Retrieve members assigned to a holiday scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["schemeId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/holiday-schemes/${args.schemeId}/members`,
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_assign_holiday_scheme_members",
    description: "Assign users to a holiday scheme.",
    inputSchema: objectSchema(
      {
        schemeId: str("Holiday scheme ID"),
        accountIds: arr("Atlassian account IDs to assign"),
      },
      ["schemeId", "accountIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: `/4/holiday-schemes/${args.schemeId}/members`,
        body: { accountIds: args.accountIds },
      }),
  },
  {
    name: "tempo_search_holiday_scheme_members",
    description: "Search members across holiday schemes.",
    inputSchema: objectSchema({
      schemeIds: arr("Holiday scheme IDs", { type: "number" }),
      accountIds: arr("Atlassian account IDs"),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/holiday-schemes/members/search", body: args }),
  },
  {
    name: "tempo_get_user_holiday_scheme",
    description: "Retrieve the holiday scheme assigned to a user.",
    inputSchema: objectSchema({ accountId: str("Atlassian account ID") }, ["accountId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/holiday-schemes/users/${args.accountId}` }),
  },
];
