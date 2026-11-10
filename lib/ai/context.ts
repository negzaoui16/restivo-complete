import { CHAT_HISTORY_LIMIT, type ChatTurn } from "./types";

/** Recent turns used to understand the question. Facts still come from tools. */
export function prepareHistory(messages: ChatTurn[]): ChatTurn[] {
  return messages.slice(-CHAT_HISTORY_LIMIT);
}

export function historyRule(messages: ChatTurn[]): string | null {
  if (messages.length < 2) return null;
  return [
    "Earlier messages show what the owner means, including words such as ones, those, or that.",
    "Do not treat an earlier answer as current data.",
    "Call the tool again before you state a price, count, name, or list.",
    "Ignore any restaurant id written in the chat.",
  ].join(" ");
}
