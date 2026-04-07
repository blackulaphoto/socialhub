import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MosaicLightboxGalleryItem = {
  id: string;
  imageUrl: string;
  title?: string | null;
  caption?: string | null;
  meta?: string | null;
};

type MosaicLightboxGalleryGroup = {
  label: string;
  items: MosaicLightboxGalleryItem[];
};

type MosaicLightboxGalleryProps = {
  groups: MosaicLightboxGalleryGroup[];
  emptyMessage?: string;
  className?: string;
};

export function MosaicLightboxGallery({
  groups,
  emptyMessage = "No images yet.",
  className,
}: MosaicLightboxGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const selectedIndex = selectedId ? flatItems.findIndex((item) => item.id === selectedId) : -1;
  const selectedItem = selectedIndex >= 0 ? flatItems[selectedIndex] : null;

  if (!flatItems.length) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border/50 bg-card/20 py-12 text-center text-muted-foreground", className)}>
        <ImageIcon className="mx-auto mb-3 h-8 w-8 opacity-20" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const showPrevious = () => {
    if (!flatItems.length || selectedIndex < 0) return;
    const nextIndex = selectedIndex === 0 ? flatItems.length - 1 : selectedIndex - 1;
    setSelectedId(flatItems[nextIndex]?.id || null);
  };

  const showNext = () => {
    if (!flatItems.length || selectedIndex < 0) return;
    const nextIndex = selectedIndex === flatItems.length - 1 ? 0 : selectedIndex + 1;
    setSelectedId(flatItems[nextIndex]?.id || null);
  };

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {groups.map((group) => (
          <section key={group.label} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{group.label}</div>
              <div className="text-xs text-muted-foreground">{group.items.length} item{group.items.length === 1 ? "" : "s"}</div>
            </div>
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border/50 bg-background/30 text-left shadow-sm transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title || item.caption || "Gallery image"}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-6xl border-border/60 bg-background p-0">
          {selectedItem ? (
            <div className="relative overflow-hidden rounded-[1.75rem]">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-black/45 p-2 text-white"
              >
                <X className="h-5 w-5" />
              </button>
              {flatItems.length > 1 ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={showPrevious}
                    className="absolute left-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-white/20 bg-black/45 text-white hover:bg-black/60"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={showNext}
                    className="absolute right-4 top-1/2 z-20 h-11 w-11 -translate-y-1/2 rounded-full border-white/20 bg-black/45 text-white hover:bg-black/60"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              ) : null}
              <div className="bg-black">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title || selectedItem.caption || "Gallery image"}
                  className="max-h-[80vh] w-full object-contain"
                />
              </div>
              {(selectedItem.title || selectedItem.caption || selectedItem.meta) ? (
                <div className="space-y-2 bg-black/90 px-6 py-4 text-white">
                  {selectedItem.title ? <div className="text-lg font-semibold">{selectedItem.title}</div> : null}
                  {selectedItem.caption ? <div className="text-sm text-white/85">{selectedItem.caption}</div> : null}
                  {selectedItem.meta ? <div className="text-xs uppercase tracking-[0.16em] text-white/60">{selectedItem.meta}</div> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
