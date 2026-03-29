import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const uploadRoot = path.join(workspaceRoot, ".local", "uploads");

const IMAGE_EXTENSIONS = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export type UploadScope =
  | "avatar"
  | "banner"
  | "post"
  | "group"
  | "event"
  | "gallery"
  | "photos";

export const allowedUploadScopes: UploadScope[] = [
  "avatar",
  "banner",
  "post",
  "group",
  "event",
  "gallery",
  "photos",
];

export function ensureUploadDirectory(scope: UploadScope) {
  const target = path.join(uploadRoot, scope);
  fs.mkdirSync(target, { recursive: true });
  return target;
}

export function getUploadRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  return uploadRoot;
}

export function getImageExtension(mimeType: string, originalName: string) {
  const direct = IMAGE_EXTENSIONS.get(mimeType);
  if (direct) return direct;

  const originalExt = path.extname(originalName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(originalExt)) {
    return originalExt === ".jpeg" ? ".jpg" : originalExt;
  }

  return null;
}

export function buildStoredFilename(userId: number, extension: string) {
  return `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
}

export function getPublicUploadUrl(req: Request, scope: UploadScope, filename: string) {
  return `${req.protocol}://${req.get("host")}/uploads/${scope}/${filename}`;
}
