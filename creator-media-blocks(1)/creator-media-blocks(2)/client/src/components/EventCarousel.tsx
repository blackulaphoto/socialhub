import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Horizontal scroll with date-forward design
 * - Cards feature date prominently, location, and tags
 * - Smooth scroll with momentum
 * - Hover effects reveal CTA button
 */

export interface EventItem {
  id: string;
  title: string;
  date: Date;
  location: string;
  tags?: string[];
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  onClick?: () => void;
}

interface EventCarouselProps {
  events: EventItem[];
  onEventClick?: (event: EventItem) => void;
}

function formatDate(date: Date): { month: string; day: string } {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  return {
    month: months[date.getMonth()],
    day: date.getDate().toString().padStart(2, '0'),
  };
}

export default function EventCarousel({
  events,
  onEventClick,
}: EventCarouselProps) {
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

  if (events.length === 0) return null;

  const handleEventClick = (event: EventItem) => {
    if (event.ctaHref) {
      window.open(event.ctaHref, '_blank');
    }
    onEventClick?.(event);
    event.onClick?.();
  };

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
        {events.map((event, index) => {
          const { month, day } = formatDate(event.date);

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-72 group cursor-pointer"
              onClick={() => handleEventClick(event)}
            >
              {/* Card Container */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="h-full rounded-lg overflow-hidden bg-card border border-border hover:border-accent transition-colors shadow-md hover:shadow-xl p-6 flex flex-col justify-between"
              >
                {/* Date Badge */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex flex-col items-center justify-center bg-accent text-accent-foreground rounded-lg p-3 min-w-fit">
                    <span className="text-xs font-bold">{month}</span>
                    <span className="text-2xl font-black">{day}</span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA Button */}
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="w-full py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:shadow-lg transition-shadow text-sm mt-auto"
                >
                  {event.ctaText || 'Get Tickets'}
                </motion.button>
              </motion.div>
            </motion.div>
          );
        })}
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
