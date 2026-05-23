export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}

export async function parseApiError(response: Response, fallback: string) {
  const error = await response.json().catch(() => null);
  return (
    (error && typeof error.message === "string" && error.message) ||
    (error && typeof error.error === "string" && error.error) ||
    fallback
  );
}
