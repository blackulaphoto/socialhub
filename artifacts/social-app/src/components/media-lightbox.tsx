import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MediaEmbed } from "@/components/media-embed";

export interface MediaLightboxItem {
  id: string | number;
  url: string;
  type?: "image" | "video" | "audio";
  title?: string | null;
  caption?: string | null;
  thumbnailUrl?: string | null;
}

interface MediaLightboxProps {
  items: MediaLightboxItem[];
  selectedId: string | number | null;
  onClose: () => void;
  showThumbnails?: boolean;
  showNavigation?: boolean;
  showMetadata?: boolean;
}

export function MediaLightbox({
  items,
  selectedId,
  onClose,
  showThumbnails = true,
  showNavigation = true,
  showMetadata = true,
}: MediaLightboxProps) {
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const currentItem = currentIndex >= 0 && currentIndex < items.length ? items[currentIndex] : null;

  // Update current index when selected ID changes
  useEffect(() => {
    if (selectedId !== null) {
      const index = items.findIndex((item) => item.id === selectedId);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
  }, [selectedId, items]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentItem) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (selectedId !== null) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [currentItem, selectedId, goToPrevious, goToNext, onClose]);

  if (!currentItem) return null;

  const isImage = !currentItem.type || currentItem.type === "image";
  const hasMultipleItems = items.length > 1;

  return (
    <Dialog open={selectedId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 gap-0 bg-black/95 border-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/10 rounded-full"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation arrows */}
        {showNavigation && hasMultipleItems && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/10 rounded-full"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/10 rounded-full"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Main content */}
        <div className="flex flex-col items-center justify-center w-full h-full">
          {/* Media display */}
          <div className="relative flex items-center justify-center w-full" style={{ maxHeight: showThumbnails ? "calc(95vh - 140px)" : "calc(95vh - 80px)" }}>
            {isImage ? (
              <img
                src={currentItem.url}
                alt={currentItem.title || ""}
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            ) : (
              <div className="w-full max-w-4xl">
                <MediaEmbed
                  type={currentItem.type!}
                  url={currentItem.url}
                  title={currentItem.title}
                />
              </div>
            )}
          </div>

          {/* Metadata */}
          {showMetadata && (currentItem.title || currentItem.caption) && (
            <div className="w-full px-6 py-4 text-white">
              {currentItem.title && (
                <h3 className="text-lg font-semibold mb-1">{currentItem.title}</h3>
              )}
              {currentItem.caption && (
                <p className="text-sm text-white/80">{currentItem.caption}</p>
              )}
            </div>
          )}

          {/* Thumbnail navigation */}
          {showThumbnails && hasMultipleItems && (
            <div className="w-full px-6 py-4 overflow-x-auto">
              <div className="flex gap-2 justify-center">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => goToIndex(index)}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all",
                      "border-2 hover:scale-105",
                      index === currentIndex
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-white/20 hover:border-white/40"
                    )}
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {index === currentIndex && (
                      <div className="absolute inset-0 bg-primary/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Item counter */}
        {hasMultipleItems && (
          <div className="absolute top-4 left-4 z-50 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
            {currentIndex + 1} / {items.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing lightbox state
export function useMediaLightbox() {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const openLightbox = useCallback((id: string | number) => {
    setSelectedId(id);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedId(null);
  }, []);

  return {
    selectedId,
    openLightbox,
    closeLightbox,
    isOpen: selectedId !== null,
  };
}
