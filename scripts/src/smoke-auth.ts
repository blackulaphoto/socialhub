import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const baseUrl = (process.env.VITE_API_BASE_URL || `http://localhost:${process.env.PORT || "3001"}`).replace(/\/$/, "");
const adminEmail = process.env.SMOKE_ADMIN_EMAIL || "admin@socialhub.local";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || "admin123";

type RequestOptions = {
  method?: string;
  body?: unknown;
  cookie?: string;
};

async function requestJson(pathname: string, options: RequestOptions = {}) {
  const response = await fetch(`${baseUrl}/api${pathname}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { response, data };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await requestJson("/healthz");
  assert(health.response.ok, `Health check failed: ${health.response.status}`);

  const login = await requestJson("/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  assert(login.response.ok, `Login failed: ${login.response.status} ${JSON.stringify(login.data)}`);

  const rawCookie = login.response.headers.get("set-cookie");
  assert(rawCookie, "Login did not return a session cookie");
  const cookie = rawCookie.split(",").map((part) => part.split(";")[0]).join("; ");

  const me = await requestJson("/auth/me", { cookie });
  assert(me.response.ok, `Session fetch failed after login: ${me.response.status}`);

  const logout = await requestJson("/auth/logout", { method: "POST", cookie });
  assert(logout.response.ok, `Logout failed: ${logout.response.status}`);

  const meAfterLogout = await requestJson("/auth/me", { cookie });
  assert(meAfterLogout.response.status === 401, `Expected 401 after logout, got ${meAfterLogout.response.status}`);

  console.log(JSON.stringify({
    baseUrl,
    login: "ok",
    me: "ok",
    logout: "ok",
    sessionCleared: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
