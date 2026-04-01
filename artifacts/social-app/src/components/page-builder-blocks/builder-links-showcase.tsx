import { ExternalLink, Globe, Mail, Music2, ShoppingBag, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

type BuilderLinkItem = {
  id: string;
  label: string;
  url: string;
  kind?: string | null;
};

type BuilderLinksShowcaseProps = {
  items: BuilderLinkItem[];
  className?: string;
};

function getLinkIcon(kind?: string | null) {
  const normalized = String(kind || "").toLowerCase();
  if (normalized.includes("shop") || normalized.includes("store")) return ShoppingBag;
  if (normalized.includes("ticket") || normalized.includes("event")) return Ticket;
  if (normalized.includes("music") || normalized.includes("audio")) return Music2;
  if (normalized.includes("mail") || normalized.includes("contact")) return Mail;
  return Globe;
}

export function BuilderLinksShowcase({ items, className }: BuilderLinksShowcaseProps) {
  if (!items.length) {
    return (
      <div className={cn("rounded-3xl border border-dashed border-border/60 bg-background/20 p-6 text-sm text-muted-foreground", className)}>
        Add portfolio, shop, or contact links to give visitors clear next steps.
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      {items.slice(0, 4).map((item) => {
        const Icon = getLinkIcon(item.kind);
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-3xl border border-border/50 bg-background/30 p-4 transition-colors hover:border-primary/30 hover:bg-background/45"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{item.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.kind || "Link"}</div>
              </div>
              <ExternalLink className="mt-1 h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
          </a>
        );
      })}
    </div>
  );
}
