import { ToolDefinition, objectSchema, str, num, arr, bool } from "./types.js";

export const worklogTools: ToolDefinition[] = [
  {
    name: "tempo_list_worklogs",
    description: "Retrieve worklogs within a date range. Supports filtering by project and issue.",
    inputSchema: objectSchema(
      {
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        project: arr("Project IDs to filter by"),
        issue: arr("Issue IDs to filter by"),
        updatedFrom: str("Only return worklogs updated after this date (YYYY-MM-DD)"),
        offset: num("Pagination offset (default 0)"),
        limit: num("Pagination limit (default 50)"),
      },
      ["from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/worklogs",
        query: {
          from: args.from as string,
          to: args.to as string,
          project: args.project as string[],
          issue: args.issue as string[],
          updatedFrom: args.updatedFrom as string,
          offset: args.offset as number,
          limit: args.limit as number,
        },
      }),
  },
  {
    name: "tempo_create_worklog",
    description: "Create a new worklog entry for time tracking.",
    inputSchema: objectSchema(
      {
        issueId: num("Jira issue ID (use issueId or issueKey)"),
        issueKey: str("Jira issue key (e.g., PROJ-123)"),
        timeSpentSeconds: num("Time spent in seconds"),
        startDate: str("Start date (YYYY-MM-DD)"),
        startTime: str("Start time (HH:MM:SS)"),
        description: str("Worklog description"),
        authorAccountId: str("Atlassian account ID of the author"),
        remainingEstimateSeconds: num("Remaining estimate in seconds"),
        attributes: arr("Work attribute values", {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" },
          },
        }),
      },
      ["timeSpentSeconds", "startDate", "authorAccountId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: "/4/worklogs",
        body: args,
      }),
  },
  {
    name: "tempo_get_worklog",
    description: "Retrieve a specific worklog by its Tempo ID.",
    inputSchema: objectSchema({ id: str("Tempo worklog ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/worklogs/${args.id}` }),
  },
  {
    name: "tempo_update_worklog",
    description: "Update an existing worklog entry.",
    inputSchema: objectSchema(
      {
        id: str("Tempo worklog ID"),
        issueId: num("Jira issue ID"),
        issueKey: str("Jira issue key"),
        timeSpentSeconds: num("Time spent in seconds"),
        startDate: str("Start date (YYYY-MM-DD)"),
        startTime: str("Start time (HH:MM:SS)"),
        description: str("Worklog description"),
        authorAccountId: str("Atlassian account ID of the author"),
        remainingEstimateSeconds: num("Remaining estimate in seconds"),
        attributes: arr("Work attribute values", {
          type: "object",
          properties: { key: { type: "string" }, value: { type: "string" } },
        }),
      },
      ["id", "timeSpentSeconds", "startDate", "authorAccountId"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/worklogs/${id}`, body });
    },
  },
  {
    name: "tempo_delete_worklog",
    description: "Delete a worklog entry.",
    inputSchema: objectSchema({ id: str("Tempo worklog ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/worklogs/${args.id}` }),
  },
  {
    name: "tempo_get_worklogs_by_account",
    description: "Retrieve worklogs for a specific Tempo account.",
    inputSchema: objectSchema(
      {
        accountKey: str("Account key"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["accountKey", "from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/worklogs/account/${args.accountKey}`,
        query: { from: args.from as string, to: args.to as string, offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_get_worklogs_by_issue",
    description: "Retrieve worklogs for a specific Jira issue.",
    inputSchema: objectSchema(
      {
        issueId: str("Jira issue ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        updatedFrom: str("Only worklogs updated after this date"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["issueId", "from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/worklogs/issue/${args.issueId}`,
        query: { from: args.from as string, to: args.to as string, updatedFrom: args.updatedFrom as string, offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_bulk_create_worklogs",
    description: "Bulk create worklogs for a specific Jira issue.",
    inputSchema: objectSchema(
      {
        issueId: str("Jira issue ID"),
        worklogs: arr("Array of worklog inputs", {
          type: "object",
          properties: {
            timeSpentSeconds: { type: "number" },
            startDate: { type: "string" },
            startTime: { type: "string" },
            description: { type: "string" },
            authorAccountId: { type: "string" },
          },
          required: ["timeSpentSeconds", "startDate", "authorAccountId"],
        }),
      },
      ["issueId", "worklogs"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: `/4/worklogs/issue/${args.issueId}/bulk`,
        body: args.worklogs,
      }),
  },
  {
    name: "tempo_get_worklogs_by_project",
    description: "Retrieve worklogs for a specific Jira project.",
    inputSchema: objectSchema(
      {
        projectId: str("Jira project ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        updatedFrom: str("Only worklogs updated after this date"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["projectId", "from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/worklogs/project/${args.projectId}`,
        query: { from: args.from as string, to: args.to as string, updatedFrom: args.updatedFrom as string, offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_search_worklogs",
    description: "Search worklogs with advanced filters (task IDs, project IDs, account IDs, etc.).",
    inputSchema: objectSchema(
      {
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        authorIds: arr("Filter by author account IDs"),
        issueIds: arr("Filter by issue IDs", { type: "number" }),
        projectIds: arr("Filter by project IDs", { type: "number" }),
        accountIds: arr("Filter by account IDs"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["from", "to"]
    ),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/worklogs/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
  {
    name: "tempo_get_worklogs_by_team",
    description: "Retrieve worklogs for a specific team.",
    inputSchema: objectSchema(
      {
        teamId: str("Team ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["teamId", "from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/worklogs/team/${args.teamId}`,
        query: { from: args.from as string, to: args.to as string, offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_get_worklogs_by_user",
    description: "Retrieve worklogs for a specific user.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        updatedFrom: str("Only worklogs updated after this date"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["accountId", "from", "to"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/worklogs/user/${args.accountId}`,
        query: { from: args.from as string, to: args.to as string, updatedFrom: args.updatedFrom as string, offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_jira_to_tempo_worklog_ids",
    description: "Convert Jira worklog IDs to Tempo worklog IDs.",
    inputSchema: objectSchema(
      { jiraWorklogIds: arr("Array of Jira worklog IDs", { type: "number" }) },
      ["jiraWorklogIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: "/4/worklogs/jira-to-tempo",
        body: { jiraWorklogIds: args.jiraWorklogIds },
      }),
  },
  {
    name: "tempo_tempo_to_jira_worklog_ids",
    description: "Convert Tempo worklog IDs to Jira worklog IDs.",
    inputSchema: objectSchema(
      { tempoWorklogIds: arr("Array of Tempo worklog IDs", { type: "number" }) },
      ["tempoWorklogIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: "/4/worklogs/tempo-to-jira",
        body: { tempoWorklogIds: args.tempoWorklogIds },
      }),
  },
  {
    name: "tempo_get_worklog_attribute_values",
    description: "Get work attribute values for a specific worklog.",
    inputSchema: objectSchema({ id: str("Tempo worklog ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/worklogs/${args.id}/work-attribute-values` }),
  },
  {
    name: "tempo_get_worklog_attribute_value",
    description: "Get a specific work attribute value for a worklog.",
    inputSchema: objectSchema(
      { id: str("Tempo worklog ID"), key: str("Work attribute key") },
      ["id", "key"]
    ),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/worklogs/${args.id}/work-attribute-values/${args.key}` }),
  },
  {
    name: "tempo_bulk_create_worklog_attribute_values",
    description: "Bulk create work attribute values for worklogs.",
    inputSchema: objectSchema(
      {
        values: arr("Array of work attribute value inputs", {
          type: "object",
          properties: {
            tempoWorklogId: { type: "number" },
            attributeKey: { type: "string" },
            value: { type: "string" },
          },
          required: ["tempoWorklogId", "attributeKey", "value"],
        }),
      },
      ["values"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/worklogs/work-attribute-values", body: args.values }),
  },
  {
    name: "tempo_search_worklog_attribute_values",
    description: "Search work attribute values across worklogs.",
    inputSchema: objectSchema(
      {
        tempoWorklogIds: arr("Worklog IDs to search", { type: "number" }),
        attributeKeys: arr("Attribute keys to filter"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["tempoWorklogIds"]
    ),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/worklogs/work-attribute-values/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
];
