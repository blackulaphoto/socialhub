import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreatorHeroSlide = {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
};

type CreatorHeroSliderProps = {
  slides: CreatorHeroSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  children?: ReactNode;
};

export function CreatorHeroSlider({
  slides,
  autoplay = true,
  autoplayInterval = 5000,
  className,
  contentClassName,
  overlayClassName,
  children,
}: CreatorHeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToSlide = useCallback((index: number) => {
    if (!slides.length) return;
    setCurrentIndex((index + slides.length) % slides.length);
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  useEffect(() => {
    if (!autoplay || slides.length < 2) return;
    const interval = window.setInterval(nextSlide, autoplayInterval);
    return () => window.clearInterval(interval);
  }, [autoplay, autoplayInterval, nextSlide, slides.length]);

  if (!slides.length) return null;

  const currentSlide = slides[currentIndex];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={currentSlide.image}
            alt={currentSlide.title}
            className="h-full w-full object-cover"
          />
          <div className={cn("absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60", overlayClassName)} />
        </motion.div>
      </AnimatePresence>

      <div className={cn("relative z-10 flex h-full flex-col justify-end", contentClassName)}>
        {children}
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/45"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/45"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentIndex ? "w-8 bg-primary" : "w-2 bg-white/45 hover:bg-white/70",
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
