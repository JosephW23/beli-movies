import type { CurrentUser } from "../types/user";
import { apiRequest } from "./client";

export type { CurrentUser } from "../types/user";

export async function getMe(
  token: string,
  signal?: AbortSignal
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/me", {
    token,
    signal,
  });
}
