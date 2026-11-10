import { ApiError } from "@/lib/auth/client";
import type { JoinBoard, MyJoinRequest } from "./types";

function headers(accessToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (json as { code?: string }).code ?? "UNKNOWN_ERROR",
      (json as { message?: string }).message ?? "An unexpected error occurred.",
      res.status
    );
  }
  return json as T;
}

export async function apiGetJoinBoard(accessToken: string): Promise<JoinBoard> {
  const res = await fetch("/api/staff/join", {
    headers: headers(accessToken),
    credentials: "include",
  });
  const json = await handleResponse<{ board: JoinBoard }>(res);
  return json.board;
}

export async function apiCreateJoinRequest(
  accessToken: string,
  input: { restaurantId: string; message?: string }
): Promise<MyJoinRequest> {
  const res = await fetch("/api/staff/join", {
    method: "POST",
    headers: headers(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await handleResponse<{ request: MyJoinRequest }>(res);
  return json.request;
}
