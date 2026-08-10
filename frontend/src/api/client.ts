const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

type ApiRequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  { token, ...options }: ApiRequestOptions = {}
): Promise<T> {
  if (!apiBaseUrl) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the status-based fallback for non-JSON responses.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
