import { ToolDefinition, objectSchema, str, num, arr, strEnum, bool } from "./types.js";

export const accountTools: ToolDefinition[] = [
  // --- Accounts ---
  {
    name: "tempo_list_accounts",
    description: "Retrieve all Tempo accounts with optional filtering by status.",
    inputSchema: objectSchema({
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
      status: strEnum("Filter by status", ["OPEN", "CLOSED", "ARCHIVED"]),
      id: arr("Filter by account IDs", { type: "number" }),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/accounts",
        query: {
          offset: args.offset as number,
          limit: args.limit as number,
          status: args.status as string,
          id: args.id as string[],
        },
      }),
  },
  {
    name: "tempo_create_account",
    description: "Create a new Tempo account.",
    inputSchema: objectSchema(
      {
        key: str("Unique account key"),
        name: str("Account name"),
        leadAccountId: str("Atlassian account ID of the lead"),
        status: strEnum("Account status", ["OPEN", "CLOSED", "ARCHIVED"]),
        categoryKey: str("Category key"),
        customerKey: str("Customer key"),
        contactAccountId: str("Contact Atlassian account ID"),
        externalContactName: str("External contact name"),
        global: bool("Whether the account is global"),
        monthlyBudget: num("Monthly budget in seconds"),
      },
      ["key", "name", "leadAccountId", "status"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/accounts", body: args }),
  },
  {
    name: "tempo_search_accounts",
    description: "Search accounts with filters.",
    inputSchema: objectSchema({
      keys: arr("Account keys to search"),
      statuses: arr("Statuses to filter"),
      customerIds: arr("Customer IDs", { type: "number" }),
      categoryKeys: arr("Category keys"),
      offset: num("Pagination offset"),
      limit: num("Pagination limit"),
    }),
    handler: async (client, args) => {
      const { offset, limit, ...body } = args;
      return client.request({
        method: "POST",
        path: "/4/accounts/search",
        query: { offset: offset as number, limit: limit as number },
        body,
      });
    },
  },
  {
    name: "tempo_get_account",
    description: "Retrieve a specific account by ID.",
    inputSchema: objectSchema({ id: str("Account ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/accounts/${args.id}` }),
  },
  {
    name: "tempo_update_account",
    description: "Update an existing account (replaces the entire resource).",
    inputSchema: objectSchema(
      {
        key: str("Account key (used in URL)"),
        name: str("Account name"),
        leadAccountId: str("Lead Atlassian account ID"),
        status: strEnum("Account status", ["OPEN", "CLOSED", "ARCHIVED"]),
        categoryKey: str("Category key"),
        customerKey: str("Customer key"),
        contactAccountId: str("Contact Atlassian account ID"),
        externalContactName: str("External contact name"),
        global: bool("Whether the account is global"),
        monthlyBudget: num("Monthly budget in seconds"),
      },
      ["key", "name", "leadAccountId", "status"]
    ),
    handler: async (client, args) => {
      const { key, ...body } = args;
      return client.request({ method: "PUT", path: `/4/accounts/${key}`, body: { key, ...body } });
    },
  },
  {
    name: "tempo_delete_account",
    description: "Delete a Tempo account.",
    inputSchema: objectSchema({ key: str("Account key") }, ["key"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/accounts/${args.key}` }),
  },
  {
    name: "tempo_get_account_links_for_account",
    description: "Retrieve links for a specific account.",
    inputSchema: objectSchema(
      {
        key: str("Account key"),
        offset: num("Pagination offset"),
        limit: num("Pagination limit"),
      },
      ["key"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: `/4/accounts/${args.key}/links`,
        query: { offset: args.offset as number, limit: args.limit as number },
      }),
  },
  // --- Account Categories ---
  {
    name: "tempo_list_account_categories",
    description: "Retrieve all account categories.",
    inputSchema: objectSchema({
      id: arr("Filter by category IDs", { type: "number" }),
    }),
    handler: async (client, args) =>
      client.request({
        method: "GET",
        path: "/4/account-categories",
        query: { id: args.id as string[] },
      }),
  },
  {
    name: "tempo_create_account_category",
    description: "Create a new account category.",
    inputSchema: objectSchema(
      {
        key: str("Unique category key"),
        name: str("Category name"),
        typeName: str("Category type name"),
      },
      ["key", "name", "typeName"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/account-categories", body: args }),
  },
  {
    name: "tempo_get_account_category",
    description: "Retrieve a specific account category.",
    inputSchema: objectSchema({ key: str("Category key") }, ["key"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/account-categories/${args.key}` }),
  },
  {
    name: "tempo_update_account_category",
    description: "Update an account category.",
    inputSchema: objectSchema(
      {
        key: str("Category key"),
        name: str("Category name"),
        typeName: str("Category type name"),
      },
      ["key", "name", "typeName"]
    ),
    handler: async (client, args) => {
      const { key, ...body } = args;
      return client.request({ method: "PUT", path: `/4/account-categories/${key}`, body: { key, ...body } });
    },
  },
  {
    name: "tempo_delete_account_category",
    description: "Delete an account category.",
    inputSchema: objectSchema({ key: str("Category key") }, ["key"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/account-categories/${args.key}` }),
  },
  {
    name: "tempo_list_account_category_types",
    description: "Retrieve all account category types.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/account-category-types" }),
  },
  // --- Account Links ---
  {
    name: "tempo_create_account_link",
    description: "Create an account link (link an account to a project/scope).",
    inputSchema: objectSchema(
      {
        accountKey: str("Account key"),
        scopeId: num("Scope ID (e.g., Jira project ID)"),
        scopeType: strEnum("Scope type", ["PROJECT"]),
        default: bool("Set as default link for this project"),
      },
      ["accountKey", "scopeId", "scopeType"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/account-links", body: args }),
  },
  {
    name: "tempo_get_account_link",
    description: "Retrieve a specific account link by ID.",
    inputSchema: objectSchema({ id: str("Account link ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/account-links/${args.id}` }),
  },
  {
    name: "tempo_delete_account_link",
    description: "Delete an account link.",
    inputSchema: objectSchema({ id: str("Account link ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/account-links/${args.id}` }),
  },
  {
    name: "tempo_set_default_account_link",
    description: "Set an account link as the default for its project.",
    inputSchema: objectSchema({ id: str("Account link ID") }, ["id"]),
    handler: async (client, args) =>
      client.request({ method: "PATCH", path: `/4/account-links/${args.id}/make-default` }),
  },
  {
    name: "tempo_get_account_links_by_project",
    description: "Retrieve account links for a project.",
    inputSchema: objectSchema({ projectId: str("Jira project ID") }, ["projectId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/account-links/project/${args.projectId}` }),
  },
];
