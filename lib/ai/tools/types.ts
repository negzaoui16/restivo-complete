import type { z } from "zod";

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  additionalProperties: false;
};

export type AiTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  schema: z.ZodType<unknown>;
  run: (restaurantId: string, args: never) => Promise<unknown>;
};

export function defineTool<T>(tool: {
  name: string;
  description: string;
  parameters: JsonSchema;
  schema: z.ZodType<T>;
  run: (restaurantId: string, args: T) => Promise<unknown>;
}): AiTool {
  return tool as AiTool;
}

export function toGroqTool(tool: AiTool) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}
