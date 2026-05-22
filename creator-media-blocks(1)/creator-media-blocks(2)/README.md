# Creator Media Blocks Pack

A reusable React component library featuring 8 UI components for creator and media-heavy websites. Built with React 19, TypeScript, and Tailwind CSS 4.

**Version:** 1.0.0 | **Status:** Beta | **Last Updated:** March 31, 2026

---

## Overview

The Creator Media Blocks Pack is a collection of self-contained, responsive components designed for websites and applications that prioritize media content and creator promotion. Components follow a dark editorial aesthetic and are optimized for reuse across multiple projects.

**What This Library Is:**
- A portable component library with clean, reusable UI blocks
- Fully responsive for mobile, tablet, and desktop
- Built with modern tooling (React, TypeScript, Tailwind, Framer Motion)
- Designed for creator portfolios, music platforms, event sites, and media-heavy applications

**What This Library Is NOT:**
- A complete application or framework
- Production-hardened software without additional testing
- A replacement for accessibility-critical applications
- A design system with exhaustive customization options

---

## Components Included

| Component | Purpose | Status |
|-----------|---------|--------|
| **HeroSlider** | Featured content showcase | Functional |
| **AudioPlayer** | Music playback interface | Functional |
| **FeaturedMusicCarousel** | Horizontal music catalog | Functional |
| **VideoPlaylistModule** | Video player with playlist | Functional |
| **MediaShowcaseGrid** | Image/video gallery | Functional |
| **LinksShowcase** | Rich link cards | Functional |
| **EventCarousel** | Event listing carousel | Functional |
| **CreatorInfoCard** | Creator profile card | Functional |

**Design & Development:**

- 🎨 **Dark Editorial Aesthetic** — Sophisticated design inspired by premium platforms
- 📱 **Fully Responsive** — Mobile-first design for all screen sizes
- ⚡ **TypeScript Support** — Strict prop typing for better developer experience
- 🎬 **Smooth Animations** — Framer Motion integration for polished interactions
- ♿ **Accessibility Included** — Semantic HTML and ARIA labels (not fully WCAG AA certified)
- 🎯 **Minimal Dependencies** — React, TypeScript, Tailwind, Framer Motion, Lucide Icons

---

## Quick Start

### Installation

1. **Copy Components**

   ```bash
   cp -r creator-media-blocks/client/src/components/* your-project/src/components/
   ```

2. **Install Dependencies**

   ```bash
   npm install framer-motion embla-carousel-react lucide-react
   ```

3. **Configure TailwindCSS**

   Ensure your `tailwind.config.ts` includes:

   ```typescript
   export default {
     content: [
       './src/**/*.{js,ts,jsx,tsx}',
     ],
   }
   ```

4. **Import and Use**

   ```tsx
   import HeroSlider from '@/components/HeroSlider';

   export default function Home() {
     const slides = [
       {
         id: '1',
         image: 'https://example.com/image.jpg',
         title: 'Welcome to My Studio',
         subtitle: 'Premium audio production',
         cta: { text: 'Book Now', href: '/booking' },
       },
     ];

     return <HeroSlider slides={slides} autoplay={true} />;
   }
   ```

---

## Component Overview

### Hero Slider

Full-bleed hero section with featured image/video slides.

```tsx
<HeroSlider
  slides={heroSlides}
  autoplay={true}
  autoplayInterval={5000}
  onSlideChange={(index) => console.log(index)}
/>
```

### Audio Player

Compact and expanded audio player with playlist support.

```tsx
<AudioPlayer
  tracks={audioTracks}
  expanded={true}
  onTrackChange={(index) => console.log(index)}
/>
```

### Featured Music Carousel

Horizontal scroll carousel with staggered card sizes.

```tsx
<FeaturedMusicCarousel
  cards={musicCards}
  onCardClick={(card) => console.log(card)}
/>
```

### Video Playlist Module

Primary video player with interactive playlist.

```tsx
<VideoPlaylistModule
  videos={videos}
  initialVideoIndex={0}
  onVideoChange={(index) => console.log(index)}
/>
```

### Media Showcase Grid

Responsive grid with featured-first layout and lightbox.

```tsx
<MediaShowcaseGrid
  items={mediaItems}
  columns={3}
  onItemClick={(item) => console.log(item)}
/>
```

### Links Showcase

Rich cards for portfolio, store, and contact links.

```tsx
<LinksShowcase
  links={links}
  columns={3}
  onLinkClick={(link) => console.log(link)}
/>
```

### Event Carousel

Date-forward carousel with location and tags.

```tsx
<EventCarousel
  events={events}
  onEventClick={(event) => console.log(event)}
/>
```

### Creator Info Card

Compact card with availability, pricing, and services.

```tsx
<CreatorInfoCard
  creator={creatorInfo}
  onCardClick={() => console.log('clicked')}
/>
```

---

## Design Philosophy

### Media-First Hierarchy

Every component prioritizes media content as the protagonist. UI elements are minimal and supportive, never competing for attention. Generous whitespace, dark backgrounds, and refined typography create an editorial feel.

### Dark, Luxurious Aesthetic

Deep charcoal backgrounds paired with off-white text create a premium, intimate experience. Muted accent colors (warm gold) add sophistication without visual noise.

### Refined Interactivity

All animations are purposeful and smooth (300-500ms transitions). Hover states are understated but clear. Loading states use elegant spinners, never crude progress bars.

### Modular & Reusable

Each component is self-contained with clear prop interfaces. They work independently or compose into larger layouts. Consistent spacing (8px multiples), typography, and color tokens ensure visual cohesion.

---

## Documentation

- **[COMPONENT_DOCUMENTATION.md](./COMPONENT_DOCUMENTATION.md)** — Detailed API reference for all 8 components
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** — Step-by-step guide for integrating into existing projects
- **[IDEAS.md](./IDEAS.md)** — Design philosophy and brainstorm document

---

## Project Structure

```
creator-media-blocks/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeroSlider.tsx
│   │   │   ├── AudioPlayer.tsx
│   │   │   ├── FeaturedMusicCarousel.tsx
│   │   │   ├── VideoPlaylistModule.tsx
│   │   │   ├── MediaShowcaseGrid.tsx
│   │   │   ├── LinksShowcase.tsx
│   │   │   ├── EventCarousel.tsx
│   │   │   └── CreatorInfoCard.tsx
│   │   ├── pages/
│   │   │   └── ComponentShowcase.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   └── index.html
├── COMPONENT_DOCUMENTATION.md
├── INTEGRATION_GUIDE.md
├── IDEAS.md
└── README.md
```

---

## Usage Examples

### Music Artist Portfolio

```tsx
import HeroSlider from '@/components/HeroSlider';
import FeaturedMusicCarousel from '@/components/FeaturedMusicCarousel';
import AudioPlayer from '@/components/AudioPlayer';
import EventCarousel from '@/components/EventCarousel';
import LinksShowcase from '@/components/LinksShowcase';

export default function ArtistPortfolio() {
  return (
    <div className="space-y-16">
      <HeroSlider slides={heroData} />
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Latest Releases</h2>
        <FeaturedMusicCarousel cards={musicCards} />
      </section>
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Now Playing</h2>
        <AudioPlayer tracks={tracks} expanded={true} />
      </section>
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Tour Dates</h2>
        <EventCarousel events={events} />
      </section>
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Connect</h2>
        <LinksShowcase links={links} />
      </section>
    </div>
  );
}
```

### Video Production Studio

```tsx
import HeroSlider from '@/components/HeroSlider';
import VideoPlaylistModule from '@/components/VideoPlaylistModule';
import MediaShowcaseGrid from '@/components/MediaShowcaseGrid';

export default function StudioPortfolio() {
  return (
    <div className="space-y-16">
      <HeroSlider slides={heroData} />
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Work</h2>
        <VideoPlaylistModule videos={videos} />
      </section>
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Portfolio</h2>
        <MediaShowcaseGrid items={mediaItems} />
      </section>
    </div>
  );
}
```

---

## Customization

### Theming

Update your `index.css` to customize colors:

```css
:root {
  --background: oklch(0.08 0.01 280);
  --foreground: oklch(0.95 0.01 280);
  --card: oklch(0.12 0.01 280);
  --accent: oklch(0.75 0.18 45); /* Your brand color */
  --muted: oklch(0.2 0.02 280);
}
```

### Typography

Update fonts in your `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Performance

- **Optimized Bundle**: ~15KB gzipped (components only)
- **Smooth Animations**: 60fps with Framer Motion
- **Lazy Loading**: Built-in support for intersection observers
- **Responsive**: Mobile-first design with minimal CSS

---

## Accessibility

Components include semantic HTML and basic ARIA labels. **Full WCAG AA compliance has not been verified.** Before using in accessibility-critical applications, review **ACCESSIBILITY_GUIDE.md** and conduct your own audit.

**Current Status:**
- ✅ Semantic HTML and basic ARIA labels
- ✅ Keyboard navigation for interactive elements
- ⚠️ Screen reader testing incomplete
- ⚠️ Keyboard shortcuts not implemented (e.g., arrow keys in carousels)
- ⚠️ High contrast mode not validated

For detailed accessibility information, see **ACCESSIBILITY_GUIDE.md**.

---

## Production Status

This library is **beta software**. It is suitable for:
- ✅ Internal projects with controlled environments
- ✅ Prototypes and proof-of-concept work
- ✅ Learning and experimentation
- ⚠️ Production only after completing accessibility and testing checklists

For detailed production readiness information, see **PRODUCTION_STATUS.md**.

---

## Known Limitations

**Customization:**
- Component sizing is fixed (no size prop variants)
- Animation timing is not configurable
- Limited theme customization without CSS variable overrides

**Internationalization:**
- All text is hardcoded in English
- No RTL language support
- Date formatting uses browser locale

**Testing:**
- No automated unit tests
- Limited cross-browser testing
- No mobile device hardware testing

---

## Development

### Running the Demo

```bash
npm run dev
```

Visit `http://localhost:3000` to see all components in action.

### Building for Production

```bash
npm run build
```

---

## Documentation

- **[COMPONENT_DOCUMENTATION.md](./COMPONENT_DOCUMENTATION.md)** — Detailed API reference for all components
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** — Step-by-step integration instructions
- **[ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md)** — Accessibility status and recommendations
- **[PRODUCTION_STATUS.md](./PRODUCTION_STATUS.md)** — Production readiness assessment

---

## License

MIT License. See LICENSE file for details.

---

## Support

For questions, issues, or feature requests:

1. Check the [COMPONENT_DOCUMENTATION.md](./COMPONENT_DOCUMENTATION.md) for detailed API reference
2. Review the [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for integration help
3. Review [ACCESSIBILITY_GUIDE.md](./ACCESSIBILITY_GUIDE.md) for accessibility information
4. Inspect the demo page for working examples

---

**Built with React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React, and Embla Carousel.**

For production use, please review PRODUCTION_STATUS.md and conduct thorough testing.
