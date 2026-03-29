const RETURN_TO_KEY = "socialhub:return-to";

export function rememberReturnTo(path: string) {
  if (typeof window === "undefined") return;
  if (!path || path === "/login" || path === "/register") return;
  window.localStorage.setItem(RETURN_TO_KEY, path);
}

export function consumeReturnTo() {
  if (typeof window === "undefined") return "/";
  const value = window.localStorage.getItem(RETURN_TO_KEY) || "/";
  window.localStorage.removeItem(RETURN_TO_KEY);
  return value;
}

export function navigateAfterAuth(path: string) {
  if (typeof window === "undefined") return;
  const target = path && path.startsWith("/") ? path : "/";
  window.location.assign(target);
}
