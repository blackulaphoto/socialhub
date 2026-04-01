import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { MediaEmbed } from "@/components/media-embed";
import { cn } from "@/lib/utils";

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

export function BuilderVideoPlaylist({ items, className }: BuilderVideoPlaylistProps) {
  if (!items.length) {
    return (
      <div className={cn("rounded-3xl border border-dashed border-border/60 bg-background/20 p-6 text-sm text-muted-foreground", className)}>
        Add a featured video or video gallery item to make this block useful.
      </div>
    );
  }

  const [activeId, setActiveId] = useState(items[0]?.id ?? null);
  const active = items.find((item) => item.id === activeId) || items[0];

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
          <div className="grid gap-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border bg-background/30 p-3 text-left transition-colors",
                  item.id === active.id ? "border-primary/60 ring-1 ring-primary/30" : "border-border/50 hover:border-primary/30",
                )}
              >
                <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" /> : <PlayCircle className="h-5 w-5 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{index === 0 ? "Primary item" : "Playlist item"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
