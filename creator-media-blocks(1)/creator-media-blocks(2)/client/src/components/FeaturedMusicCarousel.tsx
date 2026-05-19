import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Horizontal scroll with staggered card sizes
 * - Featured card (first) is larger with more prominent info
 * - Smooth scroll with momentum
 * - Hover effects reveal play button and scale
 */

export interface MusicCard {
  id: string;
  title: string;
  artist: string;
  coverImage: string;
  url?: string;
  onClick?: () => void;
}

interface FeaturedMusicCarouselProps {
  cards: MusicCard[];
  onCardClick?: (card: MusicCard) => void;
}

export default function FeaturedMusicCarousel({
  cards,
  onCardClick,
}: FeaturedMusicCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 320;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (cards.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* Scroll Buttons */}
      {canScrollLeft && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gradient-to-r from-background to-transparent hover:from-background/80 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </motion.button>
      )}

      {canScrollRight && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gradient-to-l from-background to-transparent hover:from-background/80 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 text-foreground" />
        </motion.button>
      )}

      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide flex gap-4 px-4 py-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex-shrink-0 group cursor-pointer ${
              index === 0 ? 'w-72' : 'w-56'
            }`}
            onClick={() => {
              onCardClick?.(card);
              card.onClick?.();
            }}
          >
            {/* Card Container */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="h-full rounded-lg overflow-hidden bg-card border border-border hover:border-accent transition-colors shadow-md hover:shadow-xl"
            >
              {/* Image Container */}
              <div className="relative overflow-hidden bg-muted">
                <motion.img
                  src={card.coverImage}
                  alt={card.title}
                  className={`w-full object-cover ${
                    index === 0 ? 'h-72' : 'h-56'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                />

                {/* Overlay on Hover */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-accent text-accent-foreground rounded-full"
                  >
                    <Play className="w-6 h-6 ml-0.5" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Info Section */}
              <div className={`p-4 ${index === 0 ? 'space-y-3' : 'space-y-2'}`}>
                <div>
                  <h3
                    className={`font-bold text-foreground line-clamp-2 ${
                      index === 0 ? 'text-lg' : 'text-base'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {card.artist}
                  </p>
                </div>

                {index === 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:shadow-lg transition-shadow text-sm"
                  >
                    Play Now
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Custom Scrollbar Hide */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
