import { Music2 } from "lucide-react";
import { MediaEmbed } from "@/components/media-embed";
import { cn } from "@/lib/utils";

type BuilderAudioTrack = {
  id: string;
  title: string;
  url: string;
};

type BuilderAudioPlayerProps = {
  tracks: BuilderAudioTrack[];
  className?: string;
};

export function BuilderAudioPlayer({ tracks, className }: BuilderAudioPlayerProps) {
  if (!tracks.length) {
    return (
      <div className={cn("rounded-3xl border border-dashed border-border/60 bg-background/20 p-6 text-sm text-muted-foreground", className)}>
        Add a featured track or audio gallery item to make this block useful.
      </div>
    );
  }

  const current = tracks[0];
  const queue = tracks.slice(1, 5);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-3xl border border-border/50 bg-background/30 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold">{current.title}</div>
            <div className="text-sm text-muted-foreground">Now playing block</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/50">
          <MediaEmbed url={current.url} title={current.title} className="h-40 w-full border-0" />
        </div>
      </div>
      {!!queue.length && (
        <div className="space-y-2">
          {queue.map((track) => (
            <div key={track.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 px-4 py-3">
              <Music2 className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{track.title}</div>
                <div className="text-xs text-muted-foreground">Track in queue</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
