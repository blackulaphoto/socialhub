export type TopicView = "all" | "artists" | "events" | "groups" | "users";

export function normalizeTopicTag(input: string) {
  return input.trim().replace(/^#+/, "").toLowerCase();
}

export function formatTopicTag(input: string) {
  const normalized = normalizeTopicTag(input);
  return normalized ? `#${normalized}` : "";
}

export function getTopicPath(input: string, view: TopicView = "all") {
  const normalized = normalizeTopicTag(input);
  if (!normalized) return "/search";
  const base = `/topics/${encodeURIComponent(normalized)}`;
  return view === "all" ? base : `${base}?view=${encodeURIComponent(view)}`;
}
