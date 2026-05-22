# Creator Media Blocks Pack — Component Documentation

A premium, reusable front-end component library featuring 8 polished UI components for creator and media-heavy websites. Built with React 19, TypeScript, and TailwindCSS 4.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Installation & Setup](#installation--setup)
4. [Component Library](#component-library)
5. [Integration Guide](#integration-guide)
6. [Customization](#customization)
7. [Best Practices](#best-practices)

---

## Overview

The Creator Media Blocks Pack is a portable, self-contained component library designed for creator portfolios, music platforms, event management sites, and media-heavy applications. Each component is built to be visually sophisticated, responsive, and easy to integrate into existing projects.

**Key Features:**

- **8 Production-Ready Components**: Hero Slider, Audio Player, Music Carousel, Video Playlist, Media Grid, Links Showcase, Event Carousel, and Creator Info Cards
- **Dark Editorial Aesthetic**: Premium, sophisticated design inspired by platforms like Spotify and Apple Music
- **Fully Responsive**: Mobile-first design that scales beautifully from mobile to desktop
- **TypeScript Support**: Strict prop typing for better developer experience and type safety
- **Framer Motion Integration**: Smooth, performant animations throughout
- **Accessibility First**: WCAG AA compliant with keyboard navigation and focus states
- **Zero Dependencies**: Uses only React, TypeScript, TailwindCSS, Framer Motion, Lucide Icons, and Embla Carousel

---

## Design Philosophy

### Media-First Hierarchy

Every component prioritizes media content as the protagonist. UI elements are minimal and supportive, never competing for attention. Generous whitespace, dark backgrounds, and refined typography create an editorial feel.

### Dark, Luxurious Aesthetic

Deep charcoal backgrounds (`oklch(0.08 0.01 280)`) paired with off-white text (`oklch(0.95 0.01 280)`) create a premium, intimate experience. Muted accent colors (warm gold `oklch(0.75 0.18 45)`) add sophistication without visual noise.

### Refined Interactivity

All animations are purposeful and smooth (300-500ms transitions). Hover states are understated but clear. Loading states use elegant spinners, never crude progress bars.

### Modular & Reusable

Each component is self-contained with clear prop interfaces. They work independently or compose into larger layouts. Consistent spacing (8px multiples), typography, and color tokens ensure visual cohesion.

---

## Installation & Setup

### Prerequisites

- React 19+
- TypeScript 5.6+
- TailwindCSS 4+
- Node.js 18+

### Step 1: Copy Components

Copy the component files from `/client/src/components/` to your project:

```
your-project/
├── src/
│   ├── components/
│   │   ├── HeroSlider.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── FeaturedMusicCarousel.tsx
│   │   ├── VideoPlaylistModule.tsx
│   │   ├── MediaShowcaseGrid.tsx
│   │   ├── LinksShowcase.tsx
│   │   ├── EventCarousel.tsx
│   │   └── CreatorInfoCard.tsx
```

### Step 2: Install Dependencies

Ensure your project has the required dependencies:

```bash
npm install framer-motion embla-carousel-react lucide-react
```

### Step 3: Configure TailwindCSS

Add the component paths to your `tailwind.config.ts`:

```typescript
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'oklch(0.08 0.01 280)',
        foreground: 'oklch(0.95 0.01 280)',
        card: 'oklch(0.12 0.01 280)',
        accent: 'oklch(0.75 0.18 45)',
        muted: 'oklch(0.2 0.02 280)',
      },
    },
  },
}
```

### Step 4: Update Global Styles

Add the design tokens to your `index.css`:

```css
@import "tailwindcss";

:root {
  --background: oklch(0.08 0.01 280);
  --foreground: oklch(0.95 0.01 280);
  --card: oklch(0.12 0.01 280);
  --accent: oklch(0.75 0.18 45);
  --muted: oklch(0.2 0.02 280);
}

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Component Library

### 1. Hero Slider

A full-bleed hero section with featured image/video slides, title, subtitle, and optional CTA button.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slides` | `HeroSlide[]` | Required | Array of slide objects |
| `autoplay` | `boolean` | `true` | Enable automatic slide rotation |
| `autoplayInterval` | `number` | `5000` | Autoplay interval in milliseconds |
| `onSlideChange` | `(index: number) => void` | Optional | Callback when slide changes |

**HeroSlide Interface:**

```typescript
interface HeroSlide {
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
```

**Usage Example:**

```tsx
import HeroSlider from '@/components/HeroSlider';

const slides = [
  {
    id: '1',
    image: 'https://example.com/image1.jpg',
    title: 'Welcome to My Studio',
    subtitle: 'Premium audio production',
    cta: { text: 'Book Now', href: '/booking' },
  },
];

export default function Home() {
  return <HeroSlider slides={slides} autoplay={true} />;
}
```

---

### 2. Audio Player

A versatile audio player with compact and expanded modes, playlist support, and progress tracking.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tracks` | `Track[]` | Required | Array of audio tracks |
| `initialTrackIndex` | `number` | `0` | Starting track index |
| `expanded` | `boolean` | `false` | Show expanded or compact mode |
| `onTrackChange` | `(index: number) => void` | Optional | Callback when track changes |

**Track Interface:**

```typescript
interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverImage?: string;
  url: string;
}
```

**Usage Example:**

```tsx
import AudioPlayer from '@/components/AudioPlayer';

const tracks = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artist: 'Luna Echo',
    duration: 243,
    coverImage: 'https://example.com/cover.jpg',
    url: 'https://example.com/song.mp3',
  },
];

export default function Player() {
  return <AudioPlayer tracks={tracks} expanded={true} />;
}
```

---

### 3. Featured Music Carousel

A horizontal scroll carousel with staggered card sizes, featuring a larger featured card and smaller supporting cards.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | `MusicCard[]` | Required | Array of music cards |
| `onCardClick` | `(card: MusicCard) => void` | Optional | Callback when card is clicked |

**MusicCard Interface:**

```typescript
interface MusicCard {
  id: string;
  title: string;
  artist: string;
  coverImage: string;
  url?: string;
  onClick?: () => void;
}
```

**Usage Example:**

```tsx
import FeaturedMusicCarousel from '@/components/FeaturedMusicCarousel';

const cards = [
  {
    id: '1',
    title: 'Neon Nights',
    artist: 'Luna Echo',
    coverImage: 'https://example.com/cover1.jpg',
  },
];

export default function Carousel() {
  return <FeaturedMusicCarousel cards={cards} />;
}
```

---

### 4. Video Playlist Module

A primary video player with interactive playlist thumbnails below.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videos` | `VideoItem[]` | Required | Array of video items |
| `initialVideoIndex` | `number` | `0` | Starting video index |
| `onVideoChange` | `(index: number) => void` | Optional | Callback when video changes |

**VideoItem Interface:**

```typescript
interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
}
```

**Usage Example:**

```tsx
import VideoPlaylistModule from '@/components/VideoPlaylistModule';

const videos = [
  {
    id: '1',
    title: 'Studio Session',
    thumbnail: 'https://example.com/thumb.jpg',
    videoUrl: 'https://example.com/video.mp4',
    duration: 596,
  },
];

export default function Playlist() {
  return <VideoPlaylistModule videos={videos} />;
}
```

---

### 5. Media Showcase Grid

A responsive grid with a featured-first layout and lightbox support for images and videos.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `MediaItem[]` | Required | Array of media items |
| `onItemClick` | `(item: MediaItem) => void` | Optional | Callback when item is clicked |
| `columns` | `number` | `3` | Number of columns on desktop |

**MediaItem Interface:**

```typescript
interface MediaItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  thumbnail: string;
  fullImage?: string;
  videoUrl?: string;
  description?: string;
  onClick?: () => void;
}
```

**Usage Example:**

```tsx
import MediaShowcaseGrid from '@/components/MediaShowcaseGrid';

const items = [
  {
    id: '1',
    title: 'Studio Setup',
    type: 'image',
    thumbnail: 'https://example.com/thumb.jpg',
    fullImage: 'https://example.com/full.jpg',
    description: 'Professional recording studio',
  },
];

export default function Grid() {
  return <MediaShowcaseGrid items={items} />;
}
```

---

### 6. Links Showcase

Rich cards for portfolio, store, tickets, website, and contact links with customizable icons and colors.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `links` | `LinkCard[]` | Required | Array of link cards |
| `columns` | `number` | `3` | Number of columns on desktop |
| `onLinkClick` | `(link: LinkCard) => void` | Optional | Callback when link is clicked |

**LinkCard Interface:**

```typescript
interface LinkCard {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  href?: string;
  onClick?: () => void;
  type?: 'portfolio' | 'store' | 'tickets' | 'website' | 'contact' | 'music' | 'custom';
}
```

**Usage Example:**

```tsx
import LinksShowcase from '@/components/LinksShowcase';

const links = [
  {
    id: '1',
    title: 'Portfolio',
    description: 'View my work',
    type: 'portfolio',
    href: 'https://example.com',
  },
];

export default function Links() {
  return <LinksShowcase links={links} />;
}
```

---

### 7. Event Carousel

A horizontal scroll carousel with date-forward design, featuring location, tags, and CTA buttons.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `EventItem[]` | Required | Array of event items |
| `onEventClick` | `(event: EventItem) => void` | Optional | Callback when event is clicked |

**EventItem Interface:**

```typescript
interface EventItem {
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
```

**Usage Example:**

```tsx
import EventCarousel from '@/components/EventCarousel';

const events = [
  {
    id: '1',
    title: 'Live Concert',
    date: new Date(2026, 5, 22),
    location: 'Madison Square Garden, NYC',
    tags: ['Live', 'Concert'],
    ctaText: 'Get Tickets',
    ctaHref: 'https://example.com/tickets',
  },
];

export default function Events() {
  return <EventCarousel events={events} />;
}
```

---

### 8. Creator Info Card

A compact card displaying creator information including availability, pricing, services, and location.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `creator` | `CreatorInfo` | Required | Creator information object |
| `onCardClick` | `() => void` | Optional | Callback when card is clicked |

**CreatorInfo Interface:**

```typescript
interface CreatorInfo {
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
```

**Usage Example:**

```tsx
import CreatorInfoCard from '@/components/CreatorInfoCard';

const creator = {
  name: 'Luna Echo',
  title: 'Music Producer',
  location: 'Los Angeles, CA',
  availability: 'available',
  turnaround: '2-3 weeks',
  basePrice: 500,
  services: ['Production', 'Mixing', 'Mastering'],
  image: 'https://example.com/avatar.jpg',
  bio: 'Award-winning producer',
  ctaText: 'Hire Me',
};

export default function Creator() {
  return <CreatorInfoCard creator={creator} />;
}
```

---

## Integration Guide

### Integrating into an Existing Project

**Step 1: Copy Component Files**

Copy all 8 component files to your project's `src/components/` directory.

**Step 2: Install Dependencies**

```bash
npm install framer-motion embla-carousel-react lucide-react
```

**Step 3: Import and Use**

```tsx
import HeroSlider from '@/components/HeroSlider';
import AudioPlayer from '@/components/AudioPlayer';
// ... import other components

export default function MyPage() {
  return (
    <div>
      <HeroSlider slides={heroData} />
      <AudioPlayer tracks={audioData} />
      {/* ... other components */}
    </div>
  );
}
```

### Composing Multiple Components

Components can be combined to create rich, media-forward layouts:

```tsx
export default function CreatorPortfolio() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <HeroSlider slides={heroSlides} />

      {/* Music Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Music</h2>
        <FeaturedMusicCarousel cards={musicCards} />
      </section>

      {/* Video Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Videos</h2>
        <VideoPlaylistModule videos={videos} />
      </section>

      {/* Media Gallery */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Gallery</h2>
        <MediaShowcaseGrid items={mediaItems} />
      </section>

      {/* Links */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Connect</h2>
        <LinksShowcase links={links} />
      </section>

      {/* Events */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Upcoming Events</h2>
        <EventCarousel events={events} />
      </section>

      {/* Creator Info */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">About Me</h2>
        <CreatorInfoCard creator={creatorInfo} />
      </section>
    </div>
  );
}
```

---

## Customization

### Theming

All components use TailwindCSS semantic color tokens. Customize by updating your `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        background: 'oklch(0.08 0.01 280)',
        foreground: 'oklch(0.95 0.01 280)',
        card: 'oklch(0.12 0.01 280)',
        accent: 'oklch(0.75 0.18 45)', // Change this to your brand color
        muted: 'oklch(0.2 0.02 280)',
      },
    },
  },
}
```

### Typography

Update font imports in your `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Then use in components:

```tsx
<h1 style={{ fontFamily: 'Montserrat' }} className="font-black">
  Your Title
</h1>
```

### Animation Timing

Modify animation durations by adjusting Framer Motion props in components:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.8 }} // Increase for slower animations
>
  Content
</motion.div>
```

### Responsive Breakpoints

All components use TailwindCSS responsive prefixes (`md:`, `lg:`, `xl:`). Customize breakpoints in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
}
```

---

## Best Practices

### Performance

- **Lazy Load Media**: Use intersection observers for images and videos outside the viewport
- **Optimize Images**: Compress images and use modern formats (WebP)
- **Memoize Data**: Use `useMemo` for expensive computations
- **Debounce Events**: Debounce scroll and resize listeners

### Accessibility

- All components include ARIA labels and semantic HTML
- Keyboard navigation is fully supported
- Focus states are visible and clear
- Color is never the only indicator of state
- Animations respect `prefers-reduced-motion`

### SEO

- Use semantic HTML (`<section>`, `<article>`, `<nav>`)
- Include descriptive alt text for images
- Structure content with proper heading hierarchy
- Use structured data for events and creator information

### Mobile Optimization

- All components are mobile-first responsive
- Touch targets are at least 44px × 44px
- Carousels use touch-friendly scroll
- Forms have appropriate input types and labels

### Type Safety

All components are fully typed with TypeScript. Use strict mode in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## Support & Contributing

For issues, feature requests, or contributions, please refer to the project repository. Each component is designed to be self-contained and easy to modify for your specific needs.

---

## License

This component pack is provided as-is for use in your projects. Modify and distribute as needed.

---

**Created with ❤️ for creators and media-forward applications.**
