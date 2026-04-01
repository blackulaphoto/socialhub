import { CalendarDays, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type BuilderEventItem = {
  id: string;
  title: string;
  startsAt: string;
  location?: string | null;
  city?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[] | null;
  linkedArtistsCount?: number | null;
};

type BuilderEventCarouselProps = {
  items: BuilderEventItem[];
  className?: string;
};

function formatEventParts(startsAt: string) {
  const date = new Date(startsAt);
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: "2-digit" }),
    full: date.toLocaleString(),
  };
}

export function BuilderEventCarousel({ items, className }: BuilderEventCarouselProps) {
  if (!items.length) {
    return (
      <div className={cn("rounded-3xl border border-dashed border-border/60 bg-background/20 p-6 text-sm text-muted-foreground", className)}>
        Add upcoming events to make the page feel active.
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
      {items.slice(0, 6).map((item) => {
        const { month, day, full } = formatEventParts(item.startsAt);
        const locationLabel = [item.location, item.city].filter(Boolean).join(", ");
        return (
          <div key={item.id} className="min-w-[19rem] overflow-hidden rounded-3xl border border-border/50 bg-background/30">
            <div className="relative h-44 bg-gradient-to-br from-primary/20 via-background to-cyan-500/10">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute left-4 top-4 rounded-2xl bg-background/90 px-3 py-2 text-center shadow-lg backdrop-blur">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{month}</div>
                <div className="text-xl font-bold leading-none">{day}</div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="text-xl font-semibold tracking-tight">{item.title}</div>
              {item.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={`${item.id}-${tag}`} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.description ? <div className="text-sm text-muted-foreground">{item.description}</div> : null}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground/90">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{full}</span>
                </div>
                {locationLabel ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{locationLabel}</span>
                  </div>
                ) : null}
                {typeof item.linkedArtistsCount === "number" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{item.linkedArtistsCount} linked artist{item.linkedArtistsCount === 1 ? "" : "s"}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
