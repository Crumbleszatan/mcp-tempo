import { ToolDefinition, objectSchema, str, num, arr } from "./types.js";

export const timesheetApprovalTools: ToolDefinition[] = [
  {
    name: "tempo_search_timesheet_approval_logs",
    description: "Search timesheet approval logs/history.",
    inputSchema: objectSchema({
      accountIds: arr("User account IDs"),
      from: str("Start date (YYYY-MM-DD)"),
      to: str("End date (YYYY-MM-DD)"),
    }),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/timesheet-approvals/logs/search", body: args }),
  },
  {
    name: "tempo_get_team_timesheet_approvals",
    description: "Retrieve timesheet approval status for a team.",
    inputSchema: objectSchema(
      {
        teamId: str("Team ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["teamId"]
    ),
    handler: async (client, args) => {
      const { teamId, ...query } = args;
      return client.request({
        method: "GET",
        path: `/4/timesheet-approvals/team/${teamId}`,
        query: query as Record<string, string | number>,
      });
    },
  },
  {
    name: "tempo_get_user_timesheet_approval",
    description: "Retrieve current timesheet approval status for a user.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date (YYYY-MM-DD)"),
        to: str("Period end date (YYYY-MM-DD)"),
      },
      ["accountId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/timesheet-approvals/user/${args.accountId}`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_approve_timesheet",
    description: "Approve a user's timesheet for a period.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date (YYYY-MM-DD)"),
        to: str("Period end date (YYYY-MM-DD)"),
        comment: str("Approval comment"),
      },
      ["accountId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { accountId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/timesheet-approvals/user/${accountId}/approve`,
        body,
      });
    },
  },
  {
    name: "tempo_recall_timesheet",
    description: "Recall a submitted timesheet (undo submission).",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date (YYYY-MM-DD)"),
        to: str("Period end date (YYYY-MM-DD)"),
        comment: str("Comment"),
      },
      ["accountId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { accountId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/timesheet-approvals/user/${accountId}/recall`,
        body,
      });
    },
  },
  {
    name: "tempo_reject_timesheet",
    description: "Reject a user's submitted timesheet.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date (YYYY-MM-DD)"),
        to: str("Period end date (YYYY-MM-DD)"),
        comment: str("Rejection reason/comment"),
      },
      ["accountId", "from", "to", "comment"]
    ),
    handler: async (client, args) => {
      const { accountId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/timesheet-approvals/user/${accountId}/reject`,
        body,
      });
    },
  },
  {
    name: "tempo_reopen_timesheet",
    description: "Reopen a previously approved/rejected timesheet.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date (YYYY-MM-DD)"),
        to: str("Period end date (YYYY-MM-DD)"),
        comment: str("Comment"),
      },
      ["accountId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { accountId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/timesheet-approvals/user/${accountId}/reopen`,
        body,
      });
    },
  },
  {
    name: "tempo_get_timesheet_reviewers",
    description: "Retrieve timesheet reviewers for a user.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date"),
        to: str("Period end date"),
      },
      ["accountId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/timesheet-approvals/user/${args.accountId}/reviewers`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_submit_timesheet",
    description: "Submit a timesheet for approval.",
    inputSchema: objectSchema(
      {
        accountId: str("Atlassian account ID"),
        from: str("Period start date (YYYY-MM-DD)"),
        to: str("Period end date (YYYY-MM-DD)"),
        comment: str("Submission comment"),
        reviewerAccountId: str("Reviewer account ID"),
      },
      ["accountId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { accountId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/timesheet-approvals/user/${accountId}/submit`,
        body,
      });
    },
  },
  {
    name: "tempo_get_timesheets_waiting_approval",
    description: "Retrieve all timesheets waiting for your approval.",
    inputSchema: objectSchema({
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/timesheet-approvals/waiting",
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
];
