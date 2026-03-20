import { ToolDefinition, objectSchema, str, strEnum, bool, arr } from "./types.js";

export const workAttributeTools: ToolDefinition[] = [
  {
    name: "tempo_list_work_attributes",
    description: "Retrieve all work attributes (custom fields for worklogs).",
    inputSchema: objectSchema({}),
    handler: async (client) =>
      client.request({ method: "GET", path: "/4/work-attributes" }),
  },
  {
    name: "tempo_create_work_attribute",
    description: "Create a new work attribute.",
    inputSchema: objectSchema(
      {
        key: str("Unique attribute key"),
        name: str("Attribute name"),
        type: strEnum("Attribute type", ["STATIC_LIST", "CHECKBOX", "INPUT_FIELD", "INPUT_NUMERIC"]),
        required: bool("Whether this attribute is required"),
        values: arr("Static list values (for STATIC_LIST type)"),
      },
      ["key", "name", "type"]
    ),
    handler: async (client, args) =>
      client.request({ method: "POST", path: "/4/work-attributes", body: args }),
  },
  {
    name: "tempo_get_work_attribute",
    description: "Retrieve a specific work attribute.",
    inputSchema: objectSchema({ key: str("Work attribute key") }, ["key"]),
    handler: async (client, args) =>
      client.request({ method: "GET", path: `/4/work-attributes/${args.key}` }),
  },
  {
    name: "tempo_update_work_attribute",
    description: "Update a work attribute.",
    inputSchema: objectSchema(
      {
        key: str("Work attribute key"),
        name: str("Attribute name"),
        type: strEnum("Attribute type", ["STATIC_LIST", "CHECKBOX", "INPUT_FIELD", "INPUT_NUMERIC"]),
        required: bool("Whether this attribute is required"),
        values: arr("Static list values"),
      },
      ["key", "name", "type"]
    ),
    handler: async (client, args) => {
      const { key, ...body } = args;
      return client.request({ method: "PUT", path: `/4/work-attributes/${key}`, body: { key, ...body } });
    },
  },
  {
    name: "tempo_delete_work_attribute",
    description: "Delete a work attribute.",
    inputSchema: objectSchema({ key: str("Work attribute key") }, ["key"]),
    handler: async (client, args) =>
      client.request({ method: "DELETE", path: `/4/work-attributes/${args.key}` }),
  },
];
