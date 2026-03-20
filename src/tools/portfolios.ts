import { ToolDefinition, objectSchema, str, num, arr, bool } from "./types.js";

export const portfolioTools: ToolDefinition[] = [
  {
    name: "tempo_list_portfolios",
    description: "List all portfolios.",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/portfolios" }),
  },
  {
    name: "tempo_create_portfolio",
    description: "Create a new portfolio.",
    inputSchema: objectSchema(
      {
        name: str("Portfolio name"),
        description: str("Portfolio description"),
        shared: bool("Whether the portfolio is shared"),
      },
      ["name"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/portfolios", body: args }),
  },
  {
    name: "tempo_get_portfolio",
    description: "Get a specific portfolio.",
    inputSchema: objectSchema({ portfolioId: str("Portfolio ID") }, ["portfolioId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/portfolios/${args.portfolioId}` }),
  },
  {
    name: "tempo_update_portfolio",
    description: "Update a portfolio.",
    inputSchema: objectSchema(
      {
        portfolioId: str("Portfolio ID"),
        name: str("Portfolio name"),
        description: str("Description"),
      },
      ["portfolioId", "name"]
    ),
    handler: async (client, args) => {
      const { portfolioId, ...body } = args;
      return client.request({ method: "PUT", path: `/4/portfolios/${portfolioId}`, body });
    },
  },
  {
    name: "tempo_delete_portfolio",
    description: "Delete a portfolio.",
    inputSchema: objectSchema({ portfolioId: str("Portfolio ID") }, ["portfolioId"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/portfolios/${args.portfolioId}` }),
  },
  {
    name: "tempo_list_portfolio_projects",
    description: "List projects in a portfolio.",
    inputSchema: objectSchema({ portfolioId: str("Portfolio ID") }, ["portfolioId"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/portfolios/${args.portfolioId}/projects` }),
  },
  {
    name: "tempo_add_portfolio_projects",
    description: "Add projects to a portfolio.",
    inputSchema: objectSchema(
      {
        portfolioId: str("Portfolio ID"),
        projectIds: arr("Project IDs to add", { type: "number" }),
      },
      ["portfolioId", "projectIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "POST",
        path: `/4/portfolios/${args.portfolioId}/projects`,
        body: { projectIds: args.projectIds },
      }),
  },
  {
    name: "tempo_remove_portfolio_projects",
    description: "Remove projects from a portfolio.",
    inputSchema: objectSchema(
      {
        portfolioId: str("Portfolio ID"),
        projectIds: arr("Project IDs to remove", { type: "number" }),
      },
      ["portfolioId", "projectIds"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "DELETE",
        path: `/4/portfolios/${args.portfolioId}/projects`,
        body: { projectIds: args.projectIds },
      }),
  },
  {
    name: "tempo_update_portfolio_shared",
    description: "Update sharing flag for a portfolio.",
    inputSchema: objectSchema(
      {
        portfolioId: str("Portfolio ID"),
        shared: bool("Whether the portfolio is shared"),
      },
      ["portfolioId", "shared"]
    ),
    handler: async (client, args) =>
      client.request({
        method: "PUT",
        path: `/4/portfolios/${args.portfolioId}/shared`,
        body: { shared: args.shared },
      }),
  },
];
