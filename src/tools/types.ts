import { z, ZodType } from "zod";
import { TempoClient } from "../client.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, ZodType>;
  handler: (client: TempoClient, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Build a Zod raw shape for MCP tool registration.
 * Required fields stay as-is; optional fields get .optional().
 */
export function objectSchema(
  properties: Record<string, ZodType>,
  required: string[] = []
): Record<string, ZodType> {
  const result: Record<string, ZodType> = {};
  for (const [key, schema] of Object.entries(properties)) {
    result[key] = required.includes(key) ? schema : schema.optional();
  }
  return result;
}

export const str = (desc: string): ZodType => z.string().describe(desc);
export const num = (desc: string): ZodType => z.number().describe(desc);
export const bool = (desc: string): ZodType => z.boolean().describe(desc);

export const arr = (desc: string, items?: Record<string, unknown>): ZodType => {
  if (!items || items.type === "string") {
    return z.array(z.string()).describe(desc);
  }
  if (items.type === "number") {
    return z.array(z.number()).describe(desc);
  }
  return z.array(z.record(z.string(), z.any())).describe(desc);
};

export const strEnum = (desc: string, values: string[]): ZodType =>
  z.enum(values as [string, ...string[]]).describe(desc);
