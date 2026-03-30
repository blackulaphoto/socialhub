import { ExternalLink, Link2, Music2, PlayCircle } from "lucide-react";
import { getEmbedDescriptor } from "@/lib/embeds";

type MediaEmbedProps = {
  type?: string | null;
  url?: string | null;
  title?: string | null;
  className?: string;
};

export function MediaEmbed({ type, url, title, className }: MediaEmbedProps) {
  const embed = getEmbedDescriptor(url, type);

  if (!embed || !url) return null;

  if (embed.kind === "image") {
    return <img src={url} alt={title || ""} loading="lazy" decoding="async" className={className || "w-full max-h-[32rem] object-cover"} />;
  }

  if (embed.embedUrl && embed.kind === "video") {
    return (
      <iframe
        src={embed.embedUrl}
        className={className || "w-full aspect-video border-0"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
      />
    );
  }

  if (embed.embedUrl && embed.kind === "audio") {
    return (
      <iframe
        src={embed.embedUrl}
        className={className || "w-full h-40 border-0"}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    );
  }

  return (
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {embed.kind === "video" ? <PlayCircle className="w-5 h-5 text-primary shrink-0" /> : embed.kind === "audio" ? <Music2 className="w-5 h-5 text-primary shrink-0" /> : <Link2 className="w-5 h-5 text-primary shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm font-medium">{title || embed.label}</div>
          <div className="text-xs text-muted-foreground">{embed.kind === "link" ? "External link preview" : "External media link"}</div>
        </div>
      </div>
      <a className="inline-flex items-center gap-2 text-sm text-primary hover:underline" href={embed.href} target="_blank" rel="noreferrer">
        Open <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
