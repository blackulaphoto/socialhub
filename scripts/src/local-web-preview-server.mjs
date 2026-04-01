import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const distRoot = path.join(root, "artifacts", "social-app", "dist", "public");
const port = Number(process.env.LOCAL_WEB_PREVIEW_PORT || "4173");
const apiOrigin = (process.env.LOCAL_WEB_PREVIEW_API_ORIGIN || "http://localhost:3001").replace(/\/$/, "");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function setCorsHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
}

function sendError(response, statusCode, message) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(message);
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function proxyRequest(request, response) {
  const targetUrl = `${apiOrigin}${request.url}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  headers.set("host", new URL(apiOrigin).host);

  const body =
    request.method && ["GET", "HEAD"].includes(request.method.toUpperCase())
      ? undefined
      : await readRequestBody(request);

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  response.statusCode = upstream.status;

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return;
    response.setHeader(key, value);
  });

  if (!upstream.body) {
    response.end();
    return;
  }

  const arrayBuffer = await upstream.arrayBuffer();
  response.end(Buffer.from(arrayBuffer));
}

async function serveStaticAsset(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);
  createReadStream(filePath).pipe(response);
}

async function serveApp(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(distRoot, normalizedPath);
  const safePath = path.normalize(filePath);

  if (!safePath.startsWith(distRoot)) {
    sendError(response, 403, "Forbidden");
    return;
  }

  if (existsSync(safePath)) {
    const fileStat = await stat(safePath);
    if (fileStat.isFile()) {
      await serveStaticAsset(safePath, response);
      return;
    }
  }

  const indexPath = path.join(distRoot, "index.html");
  if (!existsSync(indexPath)) {
    sendError(response, 500, "Missing frontend build. Run the preview build first.");
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(await readFile(indexPath));
}

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response);

    if (!request.url) {
      sendError(response, 400, "Invalid request");
      return;
    }

    if (request.url.startsWith("/api/") || request.url.startsWith("/uploads/")) {
      await proxyRequest(request, response);
      return;
    }

    await serveApp(request, response);
  } catch (error) {
    console.error("[local-web-preview]", error);
    sendError(response, 502, "Local preview server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Local web preview listening at http://localhost:${port}`);
  console.log(`Proxying /api and /uploads to ${apiOrigin}`);
});
