/**
 * Creator Media Blocks Pack
 * 
 * A premium, reusable front-end component library featuring 8 polished UI components
 * for creator and media-heavy websites.
 * 
 * @packageDocumentation
 */

// ============================================================================
// Components
// ============================================================================

export { default as HeroSlider } from './components/HeroSlider';
export { default as AudioPlayer } from './components/AudioPlayer';
export { default as FeaturedMusicCarousel } from './components/FeaturedMusicCarousel';
export { default as VideoPlaylistModule } from './components/VideoPlaylistModule';
export { default as MediaShowcaseGrid } from './components/MediaShowcaseGrid';
export { default as LinksShowcase } from './components/LinksShowcase';
export { default as EventCarousel } from './components/EventCarousel';
export { default as CreatorInfoCard } from './components/CreatorInfoCard';

// ============================================================================
// Types
// ============================================================================

export type {
  HeroSlide,
  HeroSliderProps,
  Track,
  AudioPlayerProps,
  MusicCard,
  FeaturedMusicCarouselProps,
  VideoItem,
  VideoPlaylistModuleProps,
  MediaItem,
  MediaShowcaseGridProps,
  LinkCard,
  LinksShowcaseProps,
  EventItem,
  EventCarouselProps,
  CreatorInfo,
  CreatorInfoCardProps,
} from './types';
