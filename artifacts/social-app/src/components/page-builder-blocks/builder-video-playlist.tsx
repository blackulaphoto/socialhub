import { useEffect, useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { MediaEmbed } from "@/components/media-embed";
import { cn } from "@/lib/utils";
import { extractFirstSupportedUrl } from "@/lib/embeds";

type BuilderVideoItem = {
  id: string;
  title: string;
  url: string;
  thumbnail?: string | null;
};

type BuilderVideoPlaylistProps = {
  items: BuilderVideoItem[];
  className?: string;
};

function getYouTubeThumbnail(url?: string | null) {
  const normalized = extractFirstSupportedUrl(url);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host.includes("youtu.be")) {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host.includes("youtube.com") || host.includes("youtube-nocookie.com") || host.includes("music.youtube.com")) {
      videoId = parsed.searchParams.get("v");
      if (!videoId) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
          videoId = parts[1];
        }
      }
    }

    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

async function getVimeoThumbnail(url?: string | null) {
  const normalized = extractFirstSupportedUrl(url);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.replace(/^www\./, "").includes("vimeo.com")) {
      return null;
    }
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(normalized)}`);
    if (!response.ok) return null;
    const data = await response.json() as { thumbnail_url?: string };
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

export function BuilderVideoPlaylist({ items, className }: BuilderVideoPlaylistProps) {
  if (!items.length) {
    return (
      <div className={cn("rounded-3xl border border-dashed border-border/60 bg-background/20 p-6 text-sm text-muted-foreground", className)}>
        Add a featured video or video gallery item to make this block useful.
      </div>
    );
  }

  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const [resolvedThumbnails, setResolvedThumbnails] = useState<Record<string, string>>({});
  const active = items.find((item) => item.id === activeId) || items[0];

  useEffect(() => {
    let cancelled = false;

    const resolveMissingThumbnails = async () => {
      const results = await Promise.all(items.map(async (item) => {
        if (item.thumbnail || getYouTubeThumbnail(item.url)) {
          return null;
        }
        const thumbnail = await getVimeoThumbnail(item.url);
        return thumbnail ? [item.id, thumbnail] as const : null;
      }));

      if (cancelled) return;

      const nextEntries = results.filter((entry): entry is readonly [string, string] => Boolean(entry));
      if (nextEntries.length) {
        setResolvedThumbnails((current) => ({
          ...current,
          ...Object.fromEntries(nextEntries),
        }));
      }
    };

    void resolveMissingThumbnails();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const itemThumbnails = useMemo(
    () => Object.fromEntries(items.map((item) => [
      item.id,
      item.thumbnail || getYouTubeThumbnail(item.url) || resolvedThumbnails[item.id] || null,
    ])),
    [items, resolvedThumbnails],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-background/30">
        <MediaEmbed url={active.url} title={active.title} className="aspect-video w-full border-0" />
        <div className="space-y-1 p-4">
          <div className="text-lg font-semibold">{active.title}</div>
          <div className="text-sm text-muted-foreground">Main player</div>
        </div>
      </div>
      {items.length > 1 ? (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Playlist</div>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-xl border-2 bg-background/20 transition-colors",
                  item.id === active.id ? "border-primary/60 ring-1 ring-primary/30" : "border-border/50 hover:border-primary/30",
                )}
                aria-label={`Load video ${item.title}`}
              >
                <div className="relative h-16 w-28 overflow-hidden bg-muted sm:h-20 sm:w-36">
                  {itemThumbnails[item.id] ? (
                    <img
                      src={itemThumbnails[item.id] || ""}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-background/30">
                      <PlayCircle className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm",
                      item.id === active.id && "bg-primary/80",
                    )}>
                      <PlayCircle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
