export type EmbedKind = "image" | "video" | "audio" | "link";

export type EmbedDescriptor = {
  kind: EmbedKind;
  embedUrl?: string;
  href: string;
  label: string;
};

const URL_PATTERN = /(https?:\/\/[^\s"'<>]+)/i;

export function extractFirstSupportedUrl(rawValue?: string | null) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  const cleanUrl = (value: string) => value.replace(/[),.;!?]+$/, "");
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) return cleanUrl(iframeMatch[1]);
  const hrefMatch = trimmed.match(/href=["']([^"']+)["']/i);
  if (hrefMatch?.[1]) return cleanUrl(hrefMatch[1]);
  const urlMatch = trimmed.match(URL_PATTERN);
  if (urlMatch?.[1]) return cleanUrl(urlMatch[1]);
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? cleanUrl(trimmed) : null;
}

export function stripEmbeddedMarkup(rawValue?: string | null) {
  if (!rawValue) return "";
  const trimmed = rawValue.trim();
  if (/<iframe[\s\S]*<\/iframe>/i.test(trimmed) || /<(a|blockquote|script)[\s\S]*>/i.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function getYouTubeId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host.includes("youtu.be")) {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (host.includes("youtube.com") || host.includes("youtube-nocookie.com") || host.includes("music.youtube.com")) {
    const watchId = url.searchParams.get("v");
    if (watchId) return watchId;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
      return parts[1];
    }
  }
  return null;
}

function getVimeoId(url: URL) {
  const match = url.pathname.match(/\/(\d+)/);
  return match?.[1] ?? null;
}

function getSpotifyPath(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0] === "embed") return parts.slice(1).join("/");
  return parts.join("/");
}

function getSoundCloudEmbed(url: URL) {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}&color=%238b5cf6&auto_play=false&show_artwork=true`;
}

export function getEmbedDescriptor(rawUrl?: string | null, type?: string | null): EmbedDescriptor | null {
  const normalizedUrl = extractFirstSupportedUrl(rawUrl);
  if (!normalizedUrl) return null;

  let url: URL;
  try {
    url = new URL(normalizedUrl);
  } catch {
    return { kind: type === "image" ? "image" : "link", href: normalizedUrl, label: normalizedUrl };
  }

  const host = url.hostname.replace(/^www\./, "");

  if (type === "image") {
    return { kind: "image", href: url.toString(), label: "Image" };
  }

  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      kind: "video",
      href: url.toString(),
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      label: "YouTube",
    };
  }

  const vimeoId = getVimeoId(url);
  if (host.includes("vimeo.com") && vimeoId) {
    return {
      kind: "video",
      href: url.toString(),
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      label: "Vimeo",
    };
  }

  const spotifyPath = getSpotifyPath(url);
  if (host.includes("spotify.com") && spotifyPath) {
    return {
      kind: "audio",
      href: url.toString(),
      embedUrl: `https://open.spotify.com/embed/${spotifyPath}`,
      label: "Spotify",
    };
  }

  if (host.includes("soundcloud.com")) {
    return {
      kind: "audio",
      href: url.toString(),
      embedUrl: getSoundCloudEmbed(url),
      label: "SoundCloud",
    };
  }

  if (type === "video") {
    return { kind: "video", href: url.toString(), label: "Video link" };
  }

  if (type === "audio") {
    return { kind: "audio", href: url.toString(), label: "Audio link" };
  }

  return { kind: "link", href: url.toString(), label: host };
}
