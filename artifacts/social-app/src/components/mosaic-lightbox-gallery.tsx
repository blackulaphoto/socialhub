import { useMemo } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaLightbox, useMediaLightbox, type MediaLightboxItem } from "@/components/media-lightbox";

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
  const { selectedId, openLightbox, closeLightbox } = useMediaLightbox();

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  // Convert items to lightbox format
  const lightboxItems: MediaLightboxItem[] = useMemo(
    () => flatItems.map((item) => ({
      id: item.id,
      url: item.imageUrl,
      type: "image" as const,
      title: item.title,
      caption: item.caption || item.meta,
      thumbnailUrl: item.imageUrl,
    })),
    [flatItems]
  );

  if (!flatItems.length) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border/50 bg-card/20 py-12 text-center text-muted-foreground", className)}>
        <ImageIcon className="mx-auto mb-3 h-8 w-8 opacity-20" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

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
                  onClick={() => openLightbox(item.id)}
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

      <MediaLightbox
        items={lightboxItems}
        selectedId={selectedId}
        onClose={closeLightbox}
        showThumbnails={flatItems.length > 1}
        showNavigation={flatItems.length > 1}
        showMetadata={true}
      />
    </>
  );
}
