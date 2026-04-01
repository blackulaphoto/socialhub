import { MapPin, Clock, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AvailabilityState = "available" | "limited" | "unavailable";

export type CreatorInfoDetails = {
  name: string;
  title?: string;
  location?: string;
  availability?: AvailabilityState;
  turnaround?: string;
  services?: string[];
  image?: string | null;
  bio?: string;
  ctaText?: string;
  ctaHref?: string;
  onClick?: () => void;
};

type CreatorInfoCardProps = {
  creator: CreatorInfoDetails;
  className?: string;
  compact?: boolean;
  interactive?: boolean;
  showImage?: boolean;
};

const availabilityTone: Record<AvailabilityState, string> = {
  available: "bg-emerald-400",
  limited: "bg-amber-400",
  unavailable: "bg-rose-400",
};

const availabilityLabel: Record<AvailabilityState, string> = {
  available: "Available now",
  limited: "Limited availability",
  unavailable: "Unavailable",
};

export function CreatorInfoCard({
  creator,
  className,
  compact = false,
  interactive = false,
  showImage = true,
}: CreatorInfoCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/80 shadow-sm",
        interactive && "transition-transform hover:scale-[1.01]",
        className,
      )}
      onClick={creator.onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-transparent to-primary/5" />
      <div className={cn("relative grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-start", compact && "p-4")}>
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className={cn("text-xl font-bold tracking-tight", compact && "text-lg")}>{creator.name}</h3>
            {creator.title ? <p className="text-sm text-muted-foreground">{creator.title}</p> : null}
          </div>

          {creator.bio ? (
            <p className={cn("text-sm leading-6 text-muted-foreground", compact && "line-clamp-3")}>{creator.bio}</p>
          ) : null}

          <div className="grid gap-2 text-sm text-muted-foreground">
            {creator.availability ? (
              <div className="inline-flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", availabilityTone[creator.availability])} />
                <span className="font-medium text-foreground/80">{availabilityLabel[creator.availability]}</span>
              </div>
            ) : null}
            {creator.location ? (
              <div className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{creator.location}</span>
              </div>
            ) : null}
            {creator.turnaround ? (
              <div className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{creator.turnaround}</span>
              </div>
            ) : null}
          </div>

          {creator.services?.length ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5" /> Focus
              </div>
              <div className="flex flex-wrap gap-2">
                {creator.services.slice(0, compact ? 3 : 5).map((service) => (
                  <Badge key={service} variant="secondary">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {creator.ctaText ? (
            creator.ctaHref ? (
              <a href={creator.ctaHref} target="_blank" rel="noreferrer" className="inline-flex">
                <Button size="sm">{creator.ctaText}</Button>
              </a>
            ) : (
              <Button size="sm" type="button">
                {creator.ctaText}
              </Button>
            )
          ) : null}
        </div>

        {showImage ? (
          <Avatar className={cn("h-20 w-20 border border-border/70 md:h-24 md:w-24", compact && "h-16 w-16")}>
            <AvatarImage src={creator.image || ""} />
            <AvatarFallback>{creator.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </div>
  );
}
