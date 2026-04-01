import { CalendarDays, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type BuilderEventItem = {
  id: string;
  title: string;
  startsAt: string;
  location?: string | null;
  description?: string | null;
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
        const { month, day } = formatEventParts(item.startsAt);
        return (
          <div key={item.id} className="min-w-[17rem] rounded-3xl border border-border/50 bg-background/30 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary px-3 py-2 text-center text-primary-foreground">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em]">{month}</div>
                <div className="text-xl font-bold">{day}</div>
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold">{item.title}</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{new Date(item.startsAt).toLocaleString()}</span>
                </div>
                {item.location ? (
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                ) : null}
              </div>
            </div>
            {item.description ? <div className="mt-3 text-sm text-muted-foreground">{item.description}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
