import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.js";
import {
  allowedUploadScopes,
  buildStoredFilename,
  ensureUploadDirectory,
  getImageExtension,
  getPublicUploadUrl,
  type UploadScope,
} from "../lib/uploads.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

router.post("/uploads/images", requireAuth, upload.single("file"), async (req, res) => {
  const rawScope = typeof req.body.scope === "string" ? req.body.scope : "post";
  if (!allowedUploadScopes.includes(rawScope as UploadScope)) {
    res.status(400).json({ error: "Invalid upload scope" });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  const extension = getImageExtension(file.mimetype, file.originalname);
  if (!extension) {
    res.status(400).json({ error: "Unsupported image type" });
    return;
  }

  const scope = rawScope as UploadScope;
  const directory = ensureUploadDirectory(scope);
  const filename = buildStoredFilename(req.session.userId!, extension);
  const targetPath = path.join(directory, filename);

  await fs.writeFile(targetPath, file.buffer);

  res.status(201).json({
    url: getPublicUploadUrl(req, scope, filename),
    path: `/uploads/${scope}/${filename}`,
    fileName: filename,
    scope,
    mimeType: file.mimetype,
    size: file.size,
  });
});

export default router;
