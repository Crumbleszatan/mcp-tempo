import { ToolDefinition, objectSchema, str, num, arr, bool, strEnum } from "./types.js";

export const planTools: ToolDefinition[] = [
  {
    name: "tempo_list_plans",
    description: "Retrieve plans with optional filters.",
    inputSchema: objectSchema({
      accountIds: arr("Filter by account IDs"),
      assigneeTypes: arr("Filter by assignee types (USER, GENERIC)"),
      from: str("Start date (YYYY-MM-DD)"),
      to: str("End date (YYYY-MM-DD)"),
      genericResourceIds: arr("Generic resource IDs", { type: "number" }),
      planIds: arr("Plan IDs", { type: "number" }),
      planItemIds: arr("Plan item IDs", { type: "number" }),
      issueIds: arr("Issue IDs", { type: "number" }),
      projectIds: arr("Project IDs", { type: "number" }),
      planItemTypes: arr("Plan item types (ISSUE, PROJECT)"),
      updatedFrom: str("Only plans updated after this date"),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/plans",
        query: args as Record<string, string | string[] | number>,
      }),
  },
  {
    name: "tempo_create_plan",
    description: "Create a new resource plan.",
    inputSchema: objectSchema(
      {
        assigneeId: str("Assignee ID (account ID or generic resource ID)"),
        assigneeType: strEnum("Assignee type", ["USER", "GENERIC"]),
        planItemId: num("Plan item ID (issue or project ID)"),
        planItemType: strEnum("Plan item type", ["ISSUE", "PROJECT"]),
        startDate: str("Start date (YYYY-MM-DD)"),
        endDate: str("End date (YYYY-MM-DD)"),
        secondsPerDay: num("Planned seconds per day"),
        plannedSecondsPerDay: arr("Planned seconds per day map", {
          type: "object",
          properties: { day: { type: "string" }, seconds: { type: "number" } },
        }),
        description: str("Plan description"),
        includeNonWorkingDays: bool("Include non-working days"),
        recurrenceEndDate: str("Recurrence end date"),
        rule: strEnum("Recurrence rule", ["NEVER", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
        startTime: str("Start time (HH:MM:SS)"),
      },
      ["assigneeId", "assigneeType", "planItemId", "planItemType", "startDate", "endDate"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/plans", body: args }),
  },
  {
    name: "tempo_search_plans",
    description: "Search plans with advanced filters.",
    inputSchema: objectSchema({
      assigneeIds: arr("Assignee IDs"),
      assigneeTypes: arr("Assignee types"),
      planItemIds: arr("Plan item IDs", { type: "number" }),
      planItemTypes: arr("Plan item types"),
      from: str("Start date"),
      to: str("End date"),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/plans/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
  {
    name: "tempo_get_plans_for_user",
    description: "Retrieve plans for a specific user.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["accountId"]
    ),
    handler: async (client, args) => {
      const { accountId, ...query } = args;
      return client.request({
        method: "GET",
        path: `/4/plans/user/${accountId}`,
        query: query as Record<string, string | number>,
      });
    },
  },
  {
    name: "tempo_get_plans_for_generic_resource",
    description: "Retrieve plans for a generic resource.",
    inputSchema: objectSchema(
      {
        genericResourceId: str("Generic resource ID"),
        from: str("Start date"),
        to: str("End date"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["genericResourceId"]
    ),
    handler: async (client, args) => {
      const { genericResourceId, ...query } = args;
      return client.request({
        method: "GET",
        path: `/4/plans/generic-resource/${genericResourceId}`,
        query: query as Record<string, string | number>,
      });
    },
  },
  {
    name: "tempo_get_plan",
    description: "Retrieve a specific plan by ID.",
    inputSchema: objectSchema({ id: str("Plan ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/plans/${args.id}` }),
  },
  {
    name: "tempo_update_plan",
    description: "Update an existing plan.",
    inputSchema: objectSchema(
      {
        id: str("Plan ID"),
        assigneeId: str("Assignee ID"),
        assigneeType: strEnum("Assignee type", ["USER", "GENERIC"]),
        planItemId: num("Plan item ID"),
        planItemType: strEnum("Plan item type", ["ISSUE", "PROJECT"]),
        startDate: str("Start date (YYYY-MM-DD)"),
        endDate: str("End date (YYYY-MM-DD)"),
        secondsPerDay: num("Planned seconds per day"),
        description: str("Plan description"),
        includeNonWorkingDays: bool("Include non-working days"),
        rule: strEnum("Recurrence rule", ["NEVER", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
      },
      ["id", "assigneeId", "assigneeType", "planItemId", "planItemType", "startDate", "endDate"]
    ),
    handler: async (client, args) => {
      const { id, ...body } = args;
      return client.request({ method: "PUT", path: `/4/plans/${id}`, body });
    },
  },
  {
    name: "tempo_delete_plan",
    description: "Delete a plan.",
    inputSchema: objectSchema({ id: str("Plan ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/plans/${args.id}` }),
  },
  {
    name: "tempo_update_plan_day",
    description: "Update a specific day within a plan.",
    inputSchema: objectSchema(
      {
        id: str("Plan ID"),
        day: str("Date (YYYY-MM-DD)"),
        secondsPerDay: num("Seconds planned for that day"),
      },
      ["id", "day", "secondsPerDay"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/plans/${args.id}/partial/${args.day}`,
        body: { secondsPerDay: args.secondsPerDay },
      }),
  },
  {
    name: "tempo_delete_plan_day",
    description: "Delete a specific day from a plan.",
    inputSchema: objectSchema(
      { id: str("Plan ID"), day: str("Date (YYYY-MM-DD)") },
      ["id", "day"]
    ),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/plans/${args.id}/partial/${args.day}` }),
  },
  // --- Plan Approvals ---
  {
    name: "tempo_get_plans_for_review",
    description: "Get plans pending review/approval.",
    inputSchema: objectSchema({
      reviewerAccountIds: arr("Reviewer account IDs"),
      from: str("Start date"),
      to: str("End date"),
      statuses: arr("Filter by statuses"),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/plan-approvals/plans-for-review", body: args }),
  },
  {
    name: "tempo_update_plan_approval",
    description: "Approve, reject, or update a plan approval.",
    inputSchema: objectSchema(
      {
        allocationId: str("Allocation/plan ID"),
        status: strEnum("Approval status", ["APPROVED", "REJECTED", "REQUESTED"]),
        comment: str("Approval comment"),
      },
      ["allocationId", "status"]
    ),
    handler: async (client, args) => {
      const { allocationId, ...body } = args;
      return client.request({ method: "PUT", path: `/4/plan-approvals/${allocationId}`, body });
    },
  },
  {
    name: "tempo_get_plan_reviewers",
    description: "Get possible plan reviewers for a user.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Start date"),
        to: str("End date"),
      },
      ["accountId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/plan-permissions/plan-reviewers",
        query: { accountId: args.accountId as string, from: args.from as string, to: args.to as string },
      }),
  },
];
