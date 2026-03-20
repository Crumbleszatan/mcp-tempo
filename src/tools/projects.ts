import { ToolDefinition, objectSchema, str, num, arr, bool, strEnum } from "./types.js";

export const projectTools: ToolDefinition[] = [
  // --- Projects ---
  {
    name: "tempo_list_projects",
    description: "List all Tempo projects.",
    inputSchema: objectSchema({
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
      key: str("Filter by project key"),
      portfolioId: num("Filter by portfolio ID"),
      status: strEnum("Filter by status", ["ACTIVE", "ARCHIVED"]),
      expand: arr("Fields to expand"),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/projects",
        query: args as Record<string, string | string[] | number>,
      }),
  },
  {
    name: "tempo_create_project",
    description: "Create a new Tempo project.",
    inputSchema: objectSchema(
      {
        key: str("Unique project key"),
        name: str("Project name"),
        jiraProjectId: num("Linked Jira project ID"),
        leadAccountId: str("Lead Atlassian account ID"),
        billingAccountId: num("Billing account ID"),
        currencyCode: str("Currency code (e.g., USD, EUR)"),
      },
      ["key", "name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/projects", body: args }),
  },
  {
    name: "tempo_get_project",
    description: "Retrieve a specific Tempo project.",
    inputSchema: objectSchema({ id: str("Project ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.id}` }),
  },
  {
    name: "tempo_update_project",
    description: "Update a Tempo project's basic info.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        key: str("Project key"),
        name: str("Project name"),
        leadAccountId: str("Lead account ID"),
      },
      ["projectId"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({ method: "PUT", path: `/4/projects/${projectId}`, body });
    },
  },
  {
    name: "tempo_delete_project",
    description: "Delete a Tempo project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/projects/${args.projectId}` }),
  },
  {
    name: "tempo_update_project_auto_sync",
    description: "Update auto-sync setting for a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        autoSync: bool("Enable auto-sync"),
      },
      ["projectId", "autoSync"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/auto-sync`,
        body: { autoSync: args.autoSync },
      }),
  },
  {
    name: "tempo_update_project_currency",
    description: "Update a project's currency.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        currencyCode: str("Currency code (e.g., USD, EUR)"),
      },
      ["projectId", "currencyCode"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/currency/${args.currencyCode}`,
      }),
  },
  {
    name: "tempo_update_project_general_access",
    description: "Update project general access settings.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        generalAccess: strEnum("General access level", ["READ", "WRITE", "NONE"]),
      },
      ["projectId", "generalAccess"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/generalAccess`,
        body: { generalAccess: args.generalAccess },
      }),
  },
  {
    name: "tempo_update_project_owner",
    description: "Update project owner.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        newOwnerId: str("New owner's Atlassian account ID"),
      },
      ["projectId", "newOwnerId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/owner/${args.newOwnerId}`,
      }),
  },
  {
    name: "tempo_update_project_attribute_value",
    description: "Update a project attribute value.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        projectAttributeId: str("Project attribute ID"),
        value: str("Attribute value"),
      },
      ["projectId", "projectAttributeId", "value"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/project-attributes/${args.projectAttributeId}`,
        body: { value: args.value },
      }),
  },
  {
    name: "tempo_update_project_rate",
    description: "Update default rates for a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        billingRate: num("Billing rate"),
        costRate: num("Cost rate"),
      },
      ["projectId"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "PUT",
        path: `/4/projects/${projectId}/rate`,
        body,
      });
    },
  },
  {
    name: "tempo_update_project_using_account_rates",
    description: "Toggle whether a project uses account-level rates.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        usingAccountRates: bool("Use account rates"),
      },
      ["projectId", "usingAccountRates"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/usingAccountRates`,
        body: { usingAccountRates: args.usingAccountRates },
      }),
  },
  {
    name: "tempo_update_project_using_global_cost_rates",
    description: "Toggle whether a project uses global cost rates.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        usingGlobalCostRates: bool("Use global cost rates"),
      },
      ["projectId", "usingGlobalCostRates"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/usingGlobalCostRates`,
        body: { usingGlobalCostRates: args.usingGlobalCostRates },
      }),
  },
  // --- Project Attributes ---
  {
    name: "tempo_list_project_attributes",
    description: "List all project attributes.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/project-attributes" }),
  },
  {
    name: "tempo_create_project_attribute",
    description: "Create a project attribute.",
    inputSchema: objectSchema(
      {
        name: str("Attribute name"),
        type: strEnum("Attribute type", ["TEXT", "NUMERIC", "STATIC_LIST"]),
        required: bool("Whether required"),
        values: arr("Values for STATIC_LIST type"),
      },
      ["name", "type"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/project-attributes", body: args }),
  },
  {
    name: "tempo_update_project_attribute",
    description: "Update a project attribute.",
    inputSchema: objectSchema(
      {
        projectAttributeId: str("Project attribute ID"),
        name: str("Attribute name"),
        type: strEnum("Attribute type", ["TEXT", "NUMERIC", "STATIC_LIST"]),
        required: bool("Whether required"),
      },
      ["projectAttributeId", "name", "type"]
    ),
    handler: async (client, args) => {
      const { projectAttributeId, ...body } = args;
      return client.request({
        method: "PUT",
        path: `/4/project-attributes/${projectAttributeId}`,
        body,
      });
    },
  },
  {
    name: "tempo_delete_project_attribute",
    description: "Delete a project attribute.",
    inputSchema: objectSchema({ projectAttributeId: str("Project attribute ID") }, ["projectAttributeId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/project-attributes/${args.projectAttributeId}` }),
  },
  // --- Project Shares ---
  {
    name: "tempo_list_project_shares",
    description: "List all shares for a project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/shares` }),
  },
  {
    name: "tempo_add_project_shares",
    description: "Add shares to a project (grant access to users).",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        accountIds: arr("Atlassian account IDs to grant access"),
      },
      ["projectId", "accountIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: `/4/projects/${args.projectId}/shares`,
        body: { accountIds: args.accountIds },
      }),
  },
  {
    name: "tempo_remove_project_shares",
    description: "Remove shares from a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        accountIds: arr("Atlassian account IDs to revoke access"),
      },
      ["projectId", "accountIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/shares`,
        body: { accountIds: args.accountIds },
      }),
  },
  // --- Budget ---
  {
    name: "tempo_get_project_budget",
    description: "Get a project's budget.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/budget` }),
  },
  {
    name: "tempo_set_project_budget",
    description: "Set a project's budget.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), newValue: num("Budget value") },
      ["projectId", "newValue"]
    ),
    handler: async (client, args) =>
      client.request({ method: "PUT", path: `/4/projects/${args.projectId}/budget/${args.newValue}` }),
  },
  {
    name: "tempo_delete_project_budget",
    description: "Delete a project's budget.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/projects/${args.projectId}/budget` }),
  },
  // --- Budget Milestones ---
  {
    name: "tempo_get_budget_milestones",
    description: "Get budget milestones for a project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/budget-milestones` }),
  },
  {
    name: "tempo_create_budget_milestone",
    description: "Create a budget milestone.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        name: str("Milestone name"),
        date: str("Milestone date (YYYY-MM-DD)"),
        amount: num("Milestone amount"),
        description: str("Description"),
      },
      ["projectId", "name", "date"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/projects/${projectId}/budget-milestones`,
        body,
      });
    },
  },
  {
    name: "tempo_update_budget_milestone",
    description: "Update a budget milestone.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        milestoneId: str("Milestone ID"),
        name: str("Milestone name"),
        date: str("Date (YYYY-MM-DD)"),
        amount: num("Amount"),
      },
      ["projectId", "milestoneId"]
    ),
    handler: async (client, args) => {
      const { projectId, milestoneId, ...body } = args;
      return client.request({
        method: "PUT",
        path: `/4/projects/${projectId}/budget-milestones/${milestoneId}`,
        body,
      });
    },
  },
  {
    name: "tempo_delete_budget_milestone",
    description: "Delete a budget milestone.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), milestoneId: str("Milestone ID") },
      ["projectId", "milestoneId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/budget-milestones/${args.milestoneId}`,
      }),
  },
  // --- Cost ---
  {
    name: "tempo_get_expense_actuals",
    description: "List expense actuals for a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date"),
        to: str("End date"),
      },
      ["projectId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/${args.projectId}/actuals/expenses`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_get_labor_actuals",
    description: "List labor actuals for a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date"),
        to: str("End date"),
      },
      ["projectId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/${args.projectId}/actuals/labor`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_get_planned_labor",
    description: "List planned labor costs for a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date"),
        to: str("End date"),
      },
      ["projectId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/${args.projectId}/plans/labor`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  // --- Expenses ---
  {
    name: "tempo_list_expenses",
    description: "List expenses for a project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/expenses` }),
  },
  {
    name: "tempo_create_expense",
    description: "Add an expense to a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        name: str("Expense name"),
        amount: num("Expense amount"),
        date: str("Expense date (YYYY-MM-DD)"),
        description: str("Description"),
        categoryId: num("Expense category ID"),
      },
      ["projectId", "name", "amount", "date"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({ method: "POST", path: `/4/projects/${projectId}/expenses`, body });
    },
  },
  {
    name: "tempo_get_expense",
    description: "Get a specific project expense.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), expenseId: str("Expense ID") },
      ["projectId", "expenseId"]
    ),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/expenses/${args.expenseId}` }),
  },
  {
    name: "tempo_update_expense",
    description: "Update a project expense.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        expenseId: str("Expense ID"),
        name: str("Expense name"),
        amount: num("Amount"),
        date: str("Date"),
        description: str("Description"),
      },
      ["projectId", "expenseId"]
    ),
    handler: async (client, args) => {
      const { projectId, expenseId, ...body } = args;
      return client.request({
        method: "PUT",
        path: `/4/projects/${projectId}/expenses/${expenseId}`,
        body,
      });
    },
  },
  {
    name: "tempo_delete_expense",
    description: "Delete a project expense.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), expenseId: str("Expense ID") },
      ["projectId", "expenseId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/expenses/${args.expenseId}`,
      }),
  },
  // --- Financials ---
  {
    name: "tempo_get_financial_summary",
    description: "Get financial summary for a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        date: str("Date for the summary (YYYY-MM-DD)"),
      },
      ["projectId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/${args.projectId}/financials/summary`,
        query: { date: args.date as string },
      }),
  },
  // --- Fixed Revenue ---
  {
    name: "tempo_list_fixed_revenues",
    description: "Get fixed revenues for a project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/fixed-revenues` }),
  },
  {
    name: "tempo_create_fixed_revenue",
    description: "Add a fixed revenue to a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        name: str("Revenue name"),
        amount: num("Amount"),
        date: str("Date (YYYY-MM-DD)"),
        description: str("Description"),
      },
      ["projectId", "name", "amount", "date"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/projects/${projectId}/fixed-revenues`,
        body,
      });
    },
  },
  {
    name: "tempo_get_fixed_revenue",
    description: "Get a specific fixed revenue.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), fixedRevenueId: str("Fixed revenue ID") },
      ["projectId", "fixedRevenueId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/${args.projectId}/fixed-revenues/${args.fixedRevenueId}`,
      }),
  },
  {
    name: "tempo_update_fixed_revenue",
    description: "Update a fixed revenue.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        fixedRevenueId: str("Fixed revenue ID"),
        name: str("Name"),
        amount: num("Amount"),
        date: str("Date"),
      },
      ["projectId", "fixedRevenueId"]
    ),
    handler: async (client, args) => {
      const { projectId, fixedRevenueId, ...body } = args;
      return client.request({
        method: "PUT",
        path: `/4/projects/${projectId}/fixed-revenues/${fixedRevenueId}`,
        body,
      });
    },
  },
  {
    name: "tempo_delete_fixed_revenue",
    description: "Delete a fixed revenue.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), fixedRevenueId: str("Fixed revenue ID") },
      ["projectId", "fixedRevenueId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/fixed-revenues/${args.fixedRevenueId}`,
      }),
  },
  // --- Project Time Approval ---
  {
    name: "tempo_get_team_member_time_approvals",
    description: "Get latest project time approvals for a team member.",
    inputSchema: objectSchema(
      {
        teamMemberId: str("Team member ID"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["teamMemberId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/time-approvals/team-member/${args.teamMemberId}`,
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
  {
    name: "tempo_get_project_time_approvals",
    description: "Get project time approvals.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date"),
        to: str("End date"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["projectId"]
    ),
    handler: async (client, args) => {
      const { projectId, ...query } = args;
      return client.request({
        method: "GET",
        path: `/4/projects/${projectId}/time-approvals`,
        query: query as Record<string, string | number>,
      });
    },
  },
  {
    name: "tempo_approve_project_time",
    description: "Approve project time.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        teamMemberIds: arr("Team member IDs to approve"),
        comment: str("Comment"),
      },
      ["projectId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/projects/${projectId}/time-approvals/approve`,
        body,
      });
    },
  },
  {
    name: "tempo_get_time_approval_labor_costs",
    description: "Get labor costs for project time approval.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date"),
        to: str("End date"),
      },
      ["projectId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/projects/${args.projectId}/time-approvals/labor-costs`,
        query: { from: args.from as string, to: args.to as string },
      }),
  },
  {
    name: "tempo_reject_project_time",
    description: "Reject project time.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        teamMemberIds: arr("Team member IDs"),
        comment: str("Rejection reason"),
      },
      ["projectId", "from", "to", "comment"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/projects/${projectId}/time-approvals/reject`,
        body,
      });
    },
  },
  {
    name: "tempo_reopen_project_time",
    description: "Reopen project time.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
        teamMemberIds: arr("Team member IDs"),
      },
      ["projectId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/projects/${projectId}/time-approvals/reopen`,
        body,
      });
    },
  },
  {
    name: "tempo_get_project_time_approvers",
    description: "Get project time approvers.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/project-time-approvers` }),
  },
  {
    name: "tempo_add_project_time_approvers",
    description: "Add project time approvers.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        accountIds: arr("Approver Atlassian account IDs"),
      },
      ["projectId", "accountIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: `/4/projects/${args.projectId}/project-time-approvers`,
        body: { accountIds: args.accountIds },
      }),
  },
  {
    name: "tempo_remove_project_time_approvers",
    description: "Remove project time approvers.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        accountIds: arr("Approver account IDs to remove"),
      },
      ["projectId", "accountIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/project-time-approvers`,
        body: { accountIds: args.accountIds },
      }),
  },
  {
    name: "tempo_set_default_project_time_approver",
    description: "Set the default project time approver.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        approverId: str("Approver Atlassian account ID"),
      },
      ["projectId", "approverId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/project-time-approvers/default/${args.approverId}`,
      }),
  },
  // --- Scope ---
  {
    name: "tempo_get_project_scope",
    description: "Get a project's scope.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/scope` }),
  },
  {
    name: "tempo_get_project_scope_tasks",
    description: "List all tasks in a project's scope.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/scope/tasks` }),
  },
  // --- Team Members in Projects ---
  {
    name: "tempo_get_project_team_member_rates",
    description: "Get team members with their rates for a project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/team-members/rates` }),
  },
  {
    name: "tempo_update_project_team_member_rate",
    description: "Update a team member's rate in a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        rateId: str("Rate ID"),
        amount: num("Rate amount"),
      },
      ["projectId", "rateId", "amount"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/team-members/rates/${args.rateId}`,
        body: { amount: args.amount },
      }),
  },
  {
    name: "tempo_delete_project_team_member_rate",
    description: "Delete a single user rate in a project.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), rateId: str("Rate ID") },
      ["projectId", "rateId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/team-members/rates/${args.rateId}`,
      }),
  },
  {
    name: "tempo_get_project_team_member_roles",
    description: "Get team members with their roles for a project.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/team-members/roles` }),
  },
  {
    name: "tempo_update_project_team_member_role",
    description: "Update a team member's role in a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        teamMemberId: str("Team member ID"),
        roleId: num("Role ID"),
      },
      ["projectId", "teamMemberId", "roleId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/projects/${args.projectId}/team-members/roles/${args.teamMemberId}`,
        body: { roleId: args.roleId },
      }),
  },
  {
    name: "tempo_create_project_team_member_rate",
    description: "Create a rate for a team member in a project.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        teamMemberId: str("Team member ID"),
        amount: num("Rate amount"),
        rateType: strEnum("Rate type", ["BILLING", "COST"]),
      },
      ["projectId", "teamMemberId", "amount"]
    ),
    handler: async (client, args) => {
      const { projectId, teamMemberId, ...body } = args;
      return client.request({
        method: "POST",
        path: `/4/projects/${projectId}/team-members/${teamMemberId}/rates`,
        body,
      });
    },
  },
  {
    name: "tempo_delete_project_team_member_rates",
    description: "Delete all rates for a team member in a project.",
    inputSchema: objectSchema(
      { projectId: str("Project ID"), teamMemberId: str("Team member ID") },
      ["projectId", "teamMemberId"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/projects/${args.projectId}/team-members/${args.teamMemberId}/rates`,
      }),
  },
  // --- Timeframe ---
  {
    name: "tempo_get_project_timeframe",
    description: "Get a project's timeframe.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/projects/${args.projectId}/timeframe` }),
  },
  {
    name: "tempo_update_project_timeframe",
    description: "Update a project's timeframe.",
    inputSchema: objectSchema(
      {
        projectId: str("Project ID"),
        from: str("Start date (YYYY-MM-DD)"),
        to: str("End date (YYYY-MM-DD)"),
      },
      ["projectId", "from", "to"]
    ),
    handler: async (client, args) => {
      const { projectId, ...body } = args;
      return client.request({
        method: "PUT",
        path: `/4/projects/${projectId}/timeframe`,
        body,
      });
    },
  },
  {
    name: "tempo_delete_project_timeframe",
    description: "Delete a project's timeframe.",
    inputSchema: objectSchema({ projectId: str("Project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/projects/${args.projectId}/timeframe` }),
  },
];
