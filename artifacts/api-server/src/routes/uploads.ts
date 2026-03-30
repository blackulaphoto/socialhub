import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.js";
import {
  allowedUploadScopes,
  getImageExtension,
  getPublicUploadUrl,
  processImageUpload,
  type UploadScope,
} from "../lib/media-storage.js";

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
  const processed = await processImageUpload({
    buffer: file.buffer,
    scope,
    userId: req.session.userId!,
    originalName: file.originalname,
    mimeType: file.mimetype,
  });

  res.status(201).json({
    storageProvider: processed.provider,
    url: getPublicUploadUrl(req, scope, processed.fileName),
    thumbnailUrl: getPublicUploadUrl(req, scope, `thumbs/${processed.thumbnailFileName}`),
    path: `/uploads/${scope}/${processed.fileName}`,
    thumbnailPath: `/uploads/${scope}/thumbs/${processed.thumbnailFileName}`,
    fileName: processed.fileName,
    scope,
    mimeType: processed.mimeType,
    size: processed.bytes,
    width: processed.width,
    height: processed.height,
  });
});

export default router;
