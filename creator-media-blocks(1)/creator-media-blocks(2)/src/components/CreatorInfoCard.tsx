import React from 'react';
import { MapPin, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Compact card with left-aligned text content
 * - Right-aligned imagery (avatar or icon)
 * - Displays availability, pricing, services, location, turnaround
 * - Clean, concise format for quick scanning
 */

export interface CreatorInfo {
  name: string;
  title?: string;
  location?: string;
  availability?: 'available' | 'limited' | 'unavailable';
  turnaround?: string;
  basePrice?: number;
  services?: string[];
  image?: string;
  bio?: string;
  ctaText?: string;
  ctaHref?: string;
  onClick?: () => void;
}

interface CreatorInfoCardProps {
  creator: CreatorInfo;
  onCardClick?: () => void;
}

const availabilityColors = {
  available: 'oklch(0.6 0.2 142)',
  limited: 'oklch(0.75 0.18 45)',
  unavailable: 'oklch(0.6 0.2 25)',
};

const availabilityLabels = {
  available: 'Available Now',
  limited: 'Limited Availability',
  unavailable: 'Unavailable',
};

export default function CreatorInfoCard({
  creator,
  onCardClick,
}: CreatorInfoCardProps) {
  const handleClick = () => {
    if (creator.ctaHref) {
      window.open(creator.ctaHref, '_blank');
    }
    onCardClick?.();
    creator.onClick?.();
  };

  const availabilityColor =
    availabilityColors[creator.availability || 'available'];
  const availabilityLabel =
    availabilityLabels[creator.availability || 'available'];

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="relative group text-left w-full max-w-sm"
    >
      {/* Card Background */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-card to-card/50 border border-border group-hover:border-accent transition-colors shadow-md group-hover:shadow-xl" />

      {/* Content Container */}
      <div className="relative p-6 flex gap-6 items-start">
        {/* Left: Text Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Name & Title */}
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {creator.name}
            </h3>
            {creator.title && (
              <p className="text-sm text-muted-foreground">{creator.title}</p>
            )}
          </div>

          {/* Bio */}
          {creator.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {creator.bio}
            </p>
          )}

          {/* Info Grid */}
          <div className="space-y-2 pt-2">
            {/* Availability */}
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: availabilityColor }}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {availabilityLabel}
              </span>
            </div>

            {/* Turnaround */}
            {creator.turnaround && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{creator.turnaround}</span>
              </div>
            )}

            {/* Location */}
            {creator.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{creator.location}</span>
              </div>
            )}

            {/* Base Price */}
            {creator.basePrice && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>From ${creator.basePrice}</span>
              </div>
            )}
          </div>

          {/* Services */}
          {creator.services && creator.services.length > 0 && (
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Services
              </p>
              <div className="flex flex-wrap gap-1">
                {creator.services.slice(0, 3).map((service) => (
                  <span
                    key={service}
                    className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                  >
                    {service}
                  </span>
                ))}
                {creator.services.length > 3 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                    +{creator.services.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA Button */}
          {creator.ctaText && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="pt-2"
            >
              <button className="w-full py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:shadow-lg transition-shadow text-sm">
                {creator.ctaText}
              </button>
            </motion.div>
          )}
        </div>

        {/* Right: Image/Avatar */}
        {creator.image && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden shadow-md border border-border"
          >
            <img
              src={creator.image}
              alt={creator.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
