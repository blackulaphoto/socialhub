import { execFileSync } from "node:child_process";
import path from "node:path";

export default async function globalTeardown() {
  if (process.env.PLAYWRIGHT_SKIP_API_BOOT === "1") {
    return;
  }
  if (process.env.PLAYWRIGHT_STOP_LOCAL_API !== "1") {
    return;
  }
  const root = path.resolve(__dirname, "..", "..");
  execFileSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", path.join(root, "scripts", "stop-local-api.ps1")],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
}
