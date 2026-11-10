import { ApiError } from "@/lib/auth/client";
import { asFollowUps } from "./follow-ups";
import { CHAT_HISTORY_LIMIT, type AnswerSource, type ChatTurn, type FollowUp } from "./types";

export async function apiAskManager(
  accessToken: string,
  restaurantId: string,
  messages: ChatTurn[]
): Promise<{ reply: string; sources: AnswerSource[]; followUps: FollowUp[] }> {
  const res = await fetch(`/api/restaurants/${restaurantId}/ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ messages: messages.slice(-CHAT_HISTORY_LIMIT) }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    reply?: string;
    sources?: AnswerSource[];
    followUps?: unknown;
    code?: string;
    message?: string;
  };
  if (!res.ok || !json.reply) {
    throw new ApiError(json.code ?? "UNKNOWN_ERROR", json.message ?? "The assistant could not answer.", res.status);
  }
  return { reply: json.reply, sources: json.sources ?? [], followUps: asFollowUps(json.followUps) };
}
