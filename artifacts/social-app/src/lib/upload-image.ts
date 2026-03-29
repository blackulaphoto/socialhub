export type UploadScope =
  | "avatar"
  | "banner"
  | "post"
  | "group"
  | "event"
  | "gallery"
  | "photos";

type UploadImageResponse = {
  url: string;
  path: string;
  fileName: string;
  scope: UploadScope;
  mimeType: string;
  size: number;
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

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message =
      (error && typeof error.error === "string" && error.error) ||
      `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
