import type { ToolLookup } from "./follow-ups";
import type { AnswerSource } from "./types";

const MAX_STEPS = 4;
const MAX_CALLS = 6;

export type ToolRequest = {
  id: string;
  name: string;
  arguments?: string;
};

export type StepMessage = {
  role: string;
  content?: string | null;
  tool_calls?: ToolRequest[];
  tool_call_id?: string;
};

type LoopOptions = {
  messages: StepMessage[];
  complete: (messages: StepMessage[], allowTools: boolean) => Promise<StepMessage>;
  execute: (call: ToolRequest) => Promise<unknown>;
};

export type ToolLoopResult = {
  reply: string;
  sources: AnswerSource[];
  lookups: ToolLookup[];
};

/** Runs tool calls until the model answers, or a step or call limit is reached. */
export async function runToolLoop({ messages, complete, execute }: LoopOptions): Promise<ToolLoopResult> {
  const thread = [...messages];
  const seen = new Set<string>();
  const sources: AnswerSource[] = [];
  const lookups: ToolLookup[] = [];
  let callsUsed = 0;

  for (let step = 0; step <= MAX_STEPS; step += 1) {
    const allowTools = step < MAX_STEPS && callsUsed < MAX_CALLS;
    const message = await complete(thread, allowTools);
    const calls = toolCalls(message);

    if (!allowTools || calls.length === 0) {
      const reply = visibleReply(message.content);
      if (reply) return { reply, sources, lookups };
      break;
    }

    thread.push({ role: "assistant", content: message.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const key = fingerprint(call);
      if (callsUsed >= MAX_CALLS) {
        thread.push(note(call.id, "Tool limit reached. Answer from the results you already have."));
        continue;
      }
      if (seen.has(key)) {
        thread.push(note(call.id, "This lookup was already done. Use the earlier result."));
        continue;
      }
      seen.add(key);
      callsUsed += 1;
      const result = await execute(call);
      const source = readSource(result);
      if (source) {
        sources.push(source);
        const data = readData(result);
        if (data !== undefined) lookups.push({ tool: source.tool, data });
      }
      thread.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  const closing = await complete(
    [...thread, { role: "user", content: "Answer now from the tool results you already have." }],
    false
  );
  const reply = visibleReply(closing.content);
  if (!reply) throw new Error("EMPTY_ANSWER");
  return { reply, sources, lookups };
}

function readData(result: unknown): unknown | undefined {
  if (!isRecord(result) || !("data" in result)) return undefined;
  return result.data;
}

function readSource(result: unknown): AnswerSource | null {
  if (!isRecord(result) || !isRecord(result.source)) return null;
  const source = result.source;
  if (typeof source.tool !== "string" || typeof source.label !== "string" || typeof source.metric !== "string") {
    return null;
  }
  return {
    tool: source.tool,
    label: source.label,
    metric: source.metric,
    records: Array.isArray(source.records) ? source.records.filter((item) => typeof item === "string") : [],
    context: typeof source.context === "string" ? source.context : "Signed-in restaurant",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function note(toolCallId: string, error: string): StepMessage {
  return { role: "tool", tool_call_id: toolCallId, content: JSON.stringify({ error }) };
}

function fingerprint(call: ToolRequest): string {
  return `${call.name}:${call.arguments?.trim() || "{}"}`;
}

function toolCalls(message: StepMessage): ToolRequest[] {
  return (message.tool_calls ?? []).filter((call) => call.id && call.name);
}

export function visibleReply(content: string | null | undefined): string {
  return (content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
