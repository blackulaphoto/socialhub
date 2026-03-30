import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { Request } from "express";
import sharp from "sharp";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..", "..");

export type UploadScope =
  | "avatar"
  | "banner"
  | "post"
  | "group"
  | "event"
  | "gallery"
  | "photos";

export type MediaStorageProviderName = "local";

export const allowedUploadScopes: UploadScope[] = [
  "avatar",
  "banner",
  "post",
  "group",
  "event",
  "gallery",
  "photos",
];

const IMAGE_SCOPE_LIMITS: Record<UploadScope, number> = {
  avatar: 768,
  banner: 2200,
  post: 1600,
  group: 1800,
  event: 1800,
  gallery: 1800,
  photos: 1800,
};

const THUMBNAIL_SCOPE_LIMITS: Record<UploadScope, number> = {
  avatar: 240,
  banner: 640,
  post: 480,
  group: 480,
  event: 480,
  gallery: 480,
  photos: 480,
};

const IMAGE_EXTENSIONS = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function getConfiguredProvider(): MediaStorageProviderName {
  const raw = process.env.MEDIA_STORAGE_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "local") {
    return "local";
  }
  throw new Error(`Unsupported MEDIA_STORAGE_PROVIDER: ${process.env.MEDIA_STORAGE_PROVIDER}`);
}

function getLocalUploadRoot() {
  return path.resolve(
    process.env.LOCAL_UPLOAD_ROOT
      || process.env.UPLOAD_ROOT
      || path.join(workspaceRoot, ".local", "uploads"),
  );
}

function getLocalUploadPublicBaseUrl(req: Request) {
  const configured = process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL || process.env.UPLOAD_PUBLIC_BASE_URL;
  const baseUrl = configured?.replace(/\/$/, "");
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  return baseUrl || requestOrigin;
}

function ensureLocalUploadDirectory(scope: UploadScope) {
  const uploadRoot = getLocalUploadRoot();
  const target = path.join(uploadRoot, scope);
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(path.join(target, "thumbs"), { recursive: true });
  return target;
}

export function getMediaStorageProviderName() {
  return getConfiguredProvider();
}

export function getMediaStorageRoot() {
  const provider = getConfiguredProvider();
  if (provider === "local") {
    const uploadRoot = getLocalUploadRoot();
    fs.mkdirSync(uploadRoot, { recursive: true });
    return uploadRoot;
  }
  throw new Error(`Unsupported media storage provider: ${provider}`);
}

export function getPublicUploadUrl(req: Request, scope: UploadScope, filename: string) {
  const provider = getConfiguredProvider();
  if (provider === "local") {
    return `${getLocalUploadPublicBaseUrl(req)}/uploads/${scope}/${filename}`;
  }
  throw new Error(`Unsupported media storage provider: ${provider}`);
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

export function describeMediaStorage(req?: Request) {
  const provider = getConfiguredProvider();
  if (provider === "local") {
    return {
      provider,
      root: getLocalUploadRoot(),
      publicBaseUrl: req ? getLocalUploadPublicBaseUrl(req) : (process.env.LOCAL_UPLOAD_PUBLIC_BASE_URL || process.env.UPLOAD_PUBLIC_BASE_URL || null),
    };
  }
  throw new Error(`Unsupported media storage provider: ${provider}`);
}

export async function processImageUpload(input: {
  buffer: Buffer;
  scope: UploadScope;
  userId: number;
  originalName: string;
  mimeType: string;
}) {
  const provider = getConfiguredProvider();
  if (provider !== "local") {
    throw new Error(`Unsupported media storage provider: ${provider}`);
  }

  const scopeDir = ensureLocalUploadDirectory(input.scope);
  const baseName = `${input.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const image = sharp(input.buffer, { animated: true, failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const maxDimension = IMAGE_SCOPE_LIMITS[input.scope];
  const thumbnailDimension = THUMBNAIL_SCOPE_LIMITS[input.scope];
  const outputExtension = metadata.format === "gif" ? ".gif" : ".webp";
  const fileName = `${baseName}${outputExtension}`;
  const thumbFileName = `${baseName}-thumb.webp`;
  const targetPath = path.join(scopeDir, fileName);
  const thumbnailPath = path.join(scopeDir, "thumbs", thumbFileName);

  if (metadata.format === "gif") {
    await fsPromises.writeFile(targetPath, input.buffer);
    await sharp(input.buffer, { animated: true, failOn: "none" })
      .rotate()
      .resize({
        width: thumbnailDimension,
        height: thumbnailDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 76 })
      .toFile(thumbnailPath);
  } else {
    await image
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toFile(targetPath);

    await sharp(input.buffer, { animated: true, failOn: "none" })
      .rotate()
      .resize({
        width: thumbnailDimension,
        height: thumbnailDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 72, effort: 4 })
      .toFile(thumbnailPath);
  }

  const finalMetadata = await sharp(targetPath, { animated: true, failOn: "none" }).metadata();
  return {
    provider,
    fileName,
    thumbnailFileName: thumbFileName,
    path: targetPath,
    thumbnailPath,
    mimeType: metadata.format === "gif" ? input.mimeType : "image/webp",
    width: finalMetadata.width ?? metadata.width ?? null,
    height: finalMetadata.height ?? metadata.height ?? null,
    bytes: (await fsPromises.stat(targetPath)).size,
  };
}
