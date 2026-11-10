/** Turns sent with each question. Older messages stay on screen. */
export const CHAT_HISTORY_LIMIT = 12;

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AnswerSource = {
  tool: string;
  label: string;
  metric: string;
  records: string[];
  context: string;
};

/** A next question the current tools can answer. `{value}` is filled by a choice or a typed name. */
export type FollowUp = {
  id: string;
  kind: "ask" | "pick" | "write";
  label: string;
  prompt: string;
  placeholder?: string;
  options?: string[];
};
