import React, { useState } from 'react';
import { Eye, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Featured card (first) takes 2x2 grid space
 * - Supporting cards are 1x1 with text on hover
 * - Responsive: 1 column (mobile), 2 columns (tablet), 3-4 columns (desktop)
 * - Lightbox-ready structure with overlay on click
 */

export interface MediaItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  thumbnail: string;
  fullImage?: string;
  videoUrl?: string;
  description?: string;
  onClick?: () => void;
}

interface MediaShowcaseGridProps {
  items: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
  columns?: number;
}

export default function MediaShowcaseGrid({
  items,
  onItemClick,
  columns = 3,
}: MediaShowcaseGridProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  if (items.length === 0) return null;

  const featuredItem = items[0];
  const otherItems = items.slice(1);

  const handleItemClick = (item: MediaItem) => {
    setSelectedItem(item);
    onItemClick?.(item);
    item.onClick?.();
  };

  return (
    <>
      {/* Grid Container */}
      <div className="w-full space-y-6">
        {/* Featured Item */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-lg overflow-hidden shadow-lg cursor-pointer group"
          onClick={() => handleItemClick(featuredItem)}
        >
          <div className="relative w-full aspect-video bg-muted">
            <img
              src={featuredItem.thumbnail}
              alt={featuredItem.title}
              className="w-full h-full object-cover"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Content Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col justify-between p-6"
            >
              {/* Icon */}
              <div className="flex justify-end">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-3 bg-accent text-accent-foreground rounded-full shadow-lg"
                >
                  {featuredItem.type === 'video' ? (
                    <Play className="w-6 h-6 ml-0.5" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </motion.div>
              </div>

              {/* Text Content */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {featuredItem.title}
                </h3>
                {featuredItem.description && (
                  <p className="text-gray-200 line-clamp-2">
                    {featuredItem.description}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Grid of Other Items */}
        {otherItems.length > 0 && (
          <div
            className={`grid gap-4 grid-cols-1 md:grid-cols-2 ${
              columns >= 3 ? 'lg:grid-cols-3' : ''
            } ${columns >= 4 ? 'xl:grid-cols-4' : ''}`}
          >
            {otherItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative rounded-lg overflow-hidden shadow-md cursor-pointer group"
                onClick={() => handleItemClick(item)}
              >
                <div className="relative w-full aspect-square bg-muted">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay on Hover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 bg-accent text-accent-foreground rounded-full shadow-lg mb-3"
                    >
                      {item.type === 'video' ? (
                        <Play className="w-6 h-6 ml-0.5" />
                      ) : (
                        <Eye className="w-6 h-6" />
                      )}
                    </motion.div>

                    <h4 className="text-white font-semibold text-center line-clamp-2">
                      {item.title}
                    </h4>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[80vh] rounded-lg overflow-hidden shadow-2xl"
            >
              {selectedItem.type === 'video' ? (
                <video
                  src={selectedItem.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedItem.fullImage || selectedItem.thumbnail}
                  alt={selectedItem.title}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>

              {/* Info Overlay */}
              {(selectedItem.title || selectedItem.description) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-2">
                    {selectedItem.title}
                  </h3>
                  {selectedItem.description && (
                    <p className="text-gray-200">{selectedItem.description}</p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
