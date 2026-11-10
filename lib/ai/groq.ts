import { RestaurantError } from "@/lib/restaurants/errors";
import { historyRule, prepareHistory } from "./context";
import { suggestFollowUps } from "./follow-ups";
import { runToolLoop, type StepMessage, type ToolRequest } from "./loop";
import { managerPrompt } from "./prompt";
import { groqTools, runManagerTool } from "./tools";
import type { AnswerSource, ChatTurn, FollowUp } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

type GroqCall = {
  id: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

type GroqMessage = StepMessage & {
  tool_calls?: GroqCall[];
};

function groqKey(): string | null {
  const value = process.env.GROQ_API_KEY ?? process.env.Groq_API_Key;
  const key = value?.trim();
  return key ? key : null;
}

export async function completeManagerChat(
  userId: string,
  restaurantId: string,
  restaurantName: string,
  messages: ChatTurn[]
): Promise<{ reply: string; sources: AnswerSource[]; followUps: FollowUp[] }> {
  const key = groqKey();
  if (!key) throw new RestaurantError("INTERNAL_ERROR", "The assistant is not configured.");
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;

  const history = prepareHistory(messages);

  try {
    const result = await runToolLoop({
      messages: [
        { role: "system", content: managerPrompt(restaurantName, historyRule(history)) },
        ...history.map((message) => ({ role: message.role, content: message.content })),
      ],
      complete: (thread, allowTools) => createCompletion(key, model, thread, allowTools),
      execute: (call) => runManagerTool(call.name, { userId, restaurantId }, call.arguments),
    });
    return { reply: result.reply, sources: result.sources, followUps: suggestFollowUps(result.lookups) };
  } catch (err) {
    if (err instanceof RestaurantError) throw err;
    throw new RestaurantError("INTERNAL_ERROR", "The assistant could not answer.");
  }
}

async function createCompletion(
  key: string,
  model: string,
  messages: StepMessage[],
  allowTools: boolean
): Promise<StepMessage> {
  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_completion_tokens: 900,
        messages: messages.map(toGroqMessage),
        ...(allowTools ? { tools: groqTools(), tool_choice: "auto" } : {}),
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new RestaurantError("INTERNAL_ERROR", "The assistant could not be reached.");
  }

  if (response.status === 429) {
    throw new RestaurantError("INTERNAL_ERROR", "The assistant is busy. Try again in a moment.");
  }
  if (!response.ok) {
    console.error("[ai] Groq request failed", response.status);
    throw new RestaurantError("INTERNAL_ERROR", "The assistant could not answer.");
  }

  const payload = (await response.json()) as { choices?: { message?: GroqMessage }[] };
  const message = payload.choices?.[0]?.message;
  if (!message) throw new RestaurantError("INTERNAL_ERROR", "The assistant returned an empty answer.");
  return {
    role: message.role || "assistant",
    content: message.content,
    tool_calls: (message.tool_calls ?? []).map(toRequest),
  };
}

function toRequest(call: GroqCall): ToolRequest {
  return { id: call.id, name: call.function?.name ?? "", arguments: call.function?.arguments };
}

function toGroqMessage(message: StepMessage) {
  if (!message.tool_calls?.length) return message;
  return {
    role: message.role,
    content: message.content ?? null,
    tool_calls: message.tool_calls.map((call) => ({
      id: call.id,
      type: "function" as const,
      function: { name: call.name, arguments: call.arguments ?? "{}" },
    })),
  };
}
