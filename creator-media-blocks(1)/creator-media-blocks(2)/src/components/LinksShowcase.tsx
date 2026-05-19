import React from 'react';
import {
  ExternalLink,
  ShoppingCart,
  Calendar,
  Mail,
  Globe,
  Music,
  LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Rich cards with icon, title, and optional description
 * - 2-3 column responsive grid
 * - Hover effects with scale and shadow deepening
 * - Icon color shifts on hover for visual feedback
 */

export interface LinkCard {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  href?: string;
  onClick?: () => void;
  type?: 'portfolio' | 'store' | 'tickets' | 'website' | 'contact' | 'music' | 'custom';
}

interface LinksShowcaseProps {
  links: LinkCard[];
  columns?: number;
  onLinkClick?: (link: LinkCard) => void;
}

const defaultIcons: Record<string, LucideIcon> = {
  portfolio: Globe,
  store: ShoppingCart,
  tickets: Calendar,
  website: Globe,
  contact: Mail,
  music: Music,
  custom: ExternalLink,
};

const defaultColors: Record<string, string> = {
  portfolio: 'oklch(0.75 0.18 45)',
  store: 'oklch(0.6 0.2 25)',
  tickets: 'oklch(0.6 0.2 280)',
  website: 'oklch(0.75 0.18 45)',
  contact: 'oklch(0.6 0.2 25)',
  music: 'oklch(0.75 0.18 45)',
  custom: 'oklch(0.75 0.18 45)',
};

export default function LinksShowcase({
  links,
  columns = 3,
  onLinkClick,
}: LinksShowcaseProps) {
  if (links.length === 0) return null;

  const handleLinkClick = (link: LinkCard) => {
    if (link.href) {
      window.open(link.href, '_blank');
    }
    onLinkClick?.(link);
    link.onClick?.();
  };

  return (
    <div
      className={`grid gap-6 grid-cols-1 md:grid-cols-2 ${
        columns >= 3 ? 'lg:grid-cols-3' : ''
      }`}
    >
      {links.map((link, index) => {
        const IconComponent = link.icon || defaultIcons[link.type || 'custom'];
        const iconColor = link.iconColor || defaultColors[link.type || 'custom'];

        return (
          <motion.button
            key={link.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleLinkClick(link)}
            className="relative group text-left"
          >
            {/* Card Background */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-card to-card/50 border border-border group-hover:border-accent transition-colors shadow-md group-hover:shadow-xl" />

            {/* Content */}
            <div className="relative p-6 h-full flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-4 rounded-full"
                style={{ backgroundColor: `${iconColor}20` }}
              >
                <IconComponent
                  className="w-8 h-8"
                  style={{ color: iconColor }}
                />
              </motion.div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {link.title}
                </h3>
                {link.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {link.description}
                  </p>
                )}
              </div>

              {/* CTA Arrow */}
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                whileHover={{ opacity: 1, x: 0 }}
                className="mt-auto pt-4"
              >
                <ExternalLink className="w-4 h-4 text-accent" />
              </motion.div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
