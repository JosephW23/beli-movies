export type CurrentUser = {
  id: number;
  email: string | null;
  supabase_sub: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function getMe(
  token: string,
  signal?: AbortSignal
): Promise<CurrentUser> {
  if (!apiBaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const response = await fetch(`${apiBaseUrl}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as CurrentUser;
}
