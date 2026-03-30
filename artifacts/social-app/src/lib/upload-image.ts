export type UploadScope =
  | "avatar"
  | "banner"
  | "post"
  | "group"
  | "event"
  | "gallery"
  | "photos";

type UploadImageResponse = {
  storageProvider?: "local";
  url: string;
  thumbnailUrl?: string | null;
  path: string;
  thumbnailPath?: string | null;
  fileName: string;
  scope: UploadScope;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
};

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}

export async function uploadImage(file: File, scope: UploadScope): Promise<UploadImageResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("scope", scope);

  const response = await fetch(`${getApiBaseUrl()}/api/uploads/images`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message =
      (error && typeof error.error === "string" && error.error) ||
      `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
