import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "./support/http";

const processImageUpload = vi.fn();
const getPublicUploadUrl = vi.fn((_req, scope: string, fileName: string) => `http://localhost:3001/uploads/${scope}/${fileName}`);
const getImageExtension = vi.fn();

vi.mock("../src/lib/media-storage.js", () => ({
  allowedUploadScopes: ["avatar", "banner", "post", "gallery", "event", "group"],
  getImageExtension,
  getPublicUploadUrl,
  processImageUpload,
}));

describe("upload routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects invalid upload scope", async () => {
    const { default: uploadsRouter } = await import("../src/routes/uploads.js");
    const app = createTestApp(uploadsRouter, 3);

    const response = await request(app)
      .post("/uploads/images")
      .field("scope", "weird")
      .attach("file", Buffer.from("fake"), "image.png");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid upload scope");
  });

  it("rejects unsupported image types", async () => {
    getImageExtension.mockReturnValue(null);

    const { default: uploadsRouter } = await import("../src/routes/uploads.js");
    const app = createTestApp(uploadsRouter, 3);

    const response = await request(app)
      .post("/uploads/images")
      .field("scope", "post")
      .attach("file", Buffer.from("fake"), { filename: "note.txt", contentType: "text/plain" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Unsupported image type");
  });

  it("stores a processed image and returns public URLs", async () => {
    getImageExtension.mockReturnValue(".webp");
    processImageUpload.mockResolvedValue({
      provider: "local",
      fileName: "hero.webp",
      thumbnailFileName: "hero-thumb.webp",
      mimeType: "image/webp",
      bytes: 2048,
      width: 1280,
      height: 720,
    });

    const { default: uploadsRouter } = await import("../src/routes/uploads.js");
    const app = createTestApp(uploadsRouter, 88);

    const response = await request(app)
      .post("/uploads/images")
      .field("scope", "post")
      .attach("file", Buffer.from("image-content"), { filename: "hero.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(processImageUpload).toHaveBeenCalled();
    expect(response.body).toMatchObject({
      storageProvider: "local",
      scope: "post",
      fileName: "hero.webp",
      thumbnailUrl: "http://localhost:3001/uploads/post/thumbs/hero-thumb.webp",
      width: 1280,
      height: 720,
    });
  });
});
