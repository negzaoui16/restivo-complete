import type { AnswerSource, FollowUp } from "@/lib/ai/types";

export type ChatRole = "owner" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
  sources?: AnswerSource[];
  followUps?: FollowUp[];
};

export function welcomeMessage(restaurantName: string): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    text: `Ask me about ${restaurantName}. I can look up the venue, the floor, the menu, and the team.`,
    time: clockLabel(),
  };
}

export function clockLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(date);
}
