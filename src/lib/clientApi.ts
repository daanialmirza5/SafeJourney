export class ApiError extends Error {}

export async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? "Something went wrong. Please try again.");
  }
  return data as T;
}
