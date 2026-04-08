import { useState } from "react";
import { cn } from "@/lib/utils";
import { MediaLightbox, useMediaLightbox, type MediaLightboxItem } from "@/components/media-lightbox";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type BuilderMediaGalleryItem = {
  id: string;
  title: string;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  description?: string | null;
};

type BuilderMediaGalleryProps = {
  items: BuilderMediaGalleryItem[];
  className?: string;
};

export function BuilderMediaGallery({ items, className }: BuilderMediaGalleryProps) {
  const { selectedId, openLightbox, closeLightbox } = useMediaLightbox();
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const activeItem = items.find((item) => item.id === activeId) || items[0] || null;

  // Convert items to lightbox format
  const lightboxItems: MediaLightboxItem[] = items.map((item) => ({
    id: item.id,
    url: item.imageUrl || item.mediaUrl || "",
    type: "image" as const,
    title: item.title,
    caption: item.description,
    thumbnailUrl: item.imageUrl || item.mediaUrl || "",
  }));

  if (!items.length) {
    return (
      <div className={cn("rounded-3xl border border-dashed border-border/60 bg-background/20 p-6 text-sm text-muted-foreground", className)}>
        Add gallery images to make this section visual.
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {activeItem ? (
          <button
            type="button"
            onClick={() => openLightbox(activeItem.id)}
            className="group block w-full overflow-hidden rounded-[2rem] border border-border/60 bg-background/20 text-left shadow-[0_24px_70px_-42px_rgba(15,23,42,0.9)]"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              <img
                src={activeItem.imageUrl || activeItem.mediaUrl || ""}
                alt={activeItem.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-white">
                <div className="text-xl font-semibold md:text-2xl">{activeItem.title}</div>
                {activeItem.description ? (
                  <div className="max-w-2xl text-sm text-white/80">{activeItem.description}</div>
                ) : null}
              </div>
            </div>
          </button>
        ) : null}
        {items.length > 1 ? (
          <Carousel
            opts={{ align: "start", dragFree: true }}
            className="relative px-10"
          >
            <CarouselContent className="-ml-3">
              {items.map((item) => (
                <CarouselItem key={item.id} className="basis-[44%] pl-3 sm:basis-[30%] lg:basis-[22%]">
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "group block w-full overflow-hidden rounded-2xl border bg-background/30 text-left transition-all",
                      item.id === activeItem?.id
                        ? "border-primary/60 shadow-[0_14px_40px_-28px_rgba(139,92,246,0.8)]"
                        : "border-border/50 hover:border-primary/25",
                    )}
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={item.imageUrl || item.mediaUrl || ""}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="line-clamp-1 text-sm font-semibold">{item.title}</div>
                      {item.description ? (
                        <div className="line-clamp-2 text-xs text-muted-foreground">{item.description}</div>
                      ) : null}
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0 top-1/2 border-border/60 bg-background/80" />
            <CarouselNext className="right-0 top-1/2 border-border/60 bg-background/80" />
          </Carousel>
        ) : null}
      </div>

      <MediaLightbox
        items={lightboxItems}
        selectedId={selectedId}
        onClose={closeLightbox}
        showThumbnails={true}
        showNavigation={true}
        showMetadata={true}
      />
    </>
  );
}
