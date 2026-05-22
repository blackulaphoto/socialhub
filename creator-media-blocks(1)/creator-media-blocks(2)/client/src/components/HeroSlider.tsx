import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Full-bleed background image with 40% dark gradient overlay
 * - Title and subtitle left-aligned, bottom-anchored
 * - Smooth fade transitions between slides
 * - Minimal navigation: dots and arrows
 */

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  cta?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
}

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  onSlideChange?: (index: number) => void;
}

export default function HeroSlider({
  slides,
  autoplay = true,
  autoplayInterval = 5000,
  onSlideChange,
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index % slides.length);
    onSlideChange?.(index % slides.length);
  }, [slides.length, onSlideChange]);

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1 + slides.length);
  }, [currentIndex, goToSlide, slides.length]);

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(nextSlide, autoplayInterval);
    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, nextSlide]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <img
            src={currentSlide.image}
            alt={currentSlide.title}
            className="w-full h-full object-cover"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-40" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end">
        <div className="container pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: 'Montserrat' }}>
              {currentSlide.title}
            </h1>

            {currentSlide.subtitle && (
              <p className="text-lg md:text-xl text-gray-200 mb-8">
                {currentSlide.subtitle}
              </p>
            )}

            {currentSlide.cta && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={currentSlide.cta.onClick}
                className="px-8 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:shadow-lg transition-shadow"
              >
                {currentSlide.cta.text}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {slides.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'w-8 bg-accent'
                : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
            whileHover={{ scale: 1.1 }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
