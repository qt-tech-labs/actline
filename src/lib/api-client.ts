/** Thin client for the versioned REST API (same endpoints a mobile app would use). */
export async function api<T = unknown>(path: string, init?: { method: "POST" | "PATCH"; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message: string } } | null;
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json?.data as T;
}
