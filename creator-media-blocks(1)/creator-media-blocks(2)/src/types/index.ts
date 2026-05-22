/**
 * Creator Media Blocks Pack — Shared Type Definitions
 * 
 * This file exports all public types used across the component library.
 * These types are intended for use by consumers integrating the pack.
 */

import { LucideIcon } from 'lucide-react';

// ============================================================================
// Hero Slider Types
// ============================================================================

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

export interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  onSlideChange?: (index: number) => void;
}

// ============================================================================
// Audio Player Types
// ============================================================================

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverImage?: string;
  url: string;
}

export interface AudioPlayerProps {
  tracks: Track[];
  initialTrackIndex?: number;
  expanded?: boolean;
  onTrackChange?: (index: number) => void;
}

// ============================================================================
// Featured Music Carousel Types
// ============================================================================

export interface MusicCard {
  id: string;
  title: string;
  artist: string;
  coverImage: string;
  url?: string;
  onClick?: () => void;
}

export interface FeaturedMusicCarouselProps {
  cards: MusicCard[];
  onCardClick?: (card: MusicCard) => void;
}

// ============================================================================
// Video Playlist Module Types
// ============================================================================

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
}

export interface VideoPlaylistModuleProps {
  videos: VideoItem[];
  initialVideoIndex?: number;
  onVideoChange?: (index: number) => void;
}

// ============================================================================
// Media Showcase Grid Types
// ============================================================================

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

export interface MediaShowcaseGridProps {
  items: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
  columns?: number;
}

// ============================================================================
// Links Showcase Types
// ============================================================================

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

export interface LinksShowcaseProps {
  links: LinkCard[];
  columns?: number;
  onLinkClick?: (link: LinkCard) => void;
}

// ============================================================================
// Event Carousel Types
// ============================================================================

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

export interface EventCarouselProps {
  events: EventItem[];
  onEventClick?: (event: EventItem) => void;
}

// ============================================================================
// Creator Info Card Types
// ============================================================================

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

export interface CreatorInfoCardProps {
  creator: CreatorInfo;
  onCardClick?: () => void;
}
