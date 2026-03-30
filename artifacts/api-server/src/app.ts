import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import { getMediaStorageRoot } from "./lib/media-storage.js";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseTrustProxy(value: string | undefined) {
  if (!value) return isProduction ? 1 : false;
  if (["true", "yes", "on"].includes(value.trim().toLowerCase())) return 1;
  if (["false", "no", "off"].includes(value.trim().toLowerCase())) return false;

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return value;
}

function parseAllowedOrigins(value: string | undefined) {
  return value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

function parseSameSite(
  value: string | undefined,
): "lax" | "strict" | "none" {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "strict" || normalized === "none") {
    return normalized;
  }
  return "lax";
}

const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);
const sameSite = parseSameSite(process.env.SESSION_COOKIE_SAMESITE);
const secureCookie = parseBoolean(
  process.env.SESSION_COOKIE_SECURE,
  isProduction || sameSite === "none",
);

app.set("trust proxy", trustProxy);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0) {
        if (!isProduction) {
          callback(null, true);
          return;
        }

        callback(new Error("CORS origin denied. Set CORS_ORIGINS."));
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(getMediaStorageRoot()), {
  maxAge: "365d",
  immutable: true,
}));

app.use(
  session({
    name: process.env.SESSION_COOKIE_NAME || "socialhub.sid",
    secret: process.env.SESSION_SECRET || "artisthub-secret-dev",
    resave: false,
    saveUninitialized: false,
    proxy: Boolean(trustProxy),
    cookie: {
      secure: secureCookie,
      sameSite,
      domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

app.use("/api", router);

export default app;
