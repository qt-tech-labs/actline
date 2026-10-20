/** Thin client for the versioned REST API (same endpoints a mobile app would use). */

/** A failed request: the server's error code plus its message. */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/** The code of a failed request, or "network" when the server was unreachable. */
export function apiErrorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : "network";
}

/** The server's own message, when there is one. */
export function apiErrorDetail(error: unknown): string | null {
  return error instanceof ApiError && error.message ? error.message : null;
}

export async function api<T = unknown>(path: string, init?: { method: "POST" | "PATCH" | "DELETE"; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { code?: string; message?: string } } | null;
  if (!res.ok) {
    throw new ApiError(json?.error?.code ?? "unknown", json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json?.data as T;
}
