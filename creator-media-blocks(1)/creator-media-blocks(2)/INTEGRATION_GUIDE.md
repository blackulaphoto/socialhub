# Creator Media Blocks Pack — Integration Guide

This guide walks you through integrating the Creator Media Blocks Pack into your existing React projects.

---

## Quick Start

### 1. Copy Components to Your Project

Copy the 8 component files from this pack to your project:

```bash
cp -r creator-media-blocks/client/src/components/* your-project/src/components/
```

The components are:

- `HeroSlider.tsx`
- `AudioPlayer.tsx`
- `FeaturedMusicCarousel.tsx`
- `VideoPlaylistModule.tsx`
- `MediaShowcaseGrid.tsx`
- `LinksShowcase.tsx`
- `EventCarousel.tsx`
- `CreatorInfoCard.tsx`

### 2. Install Required Dependencies

```bash
npm install framer-motion embla-carousel-react lucide-react
```

Or with yarn:

```bash
yarn add framer-motion embla-carousel-react lucide-react
```

### 3. Configure TailwindCSS

Ensure your `tailwind.config.ts` includes the component paths:

```typescript
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
}
```

### 4. Import and Use

```tsx
import HeroSlider from '@/components/HeroSlider';

export default function Home() {
  const slides = [
    {
      id: '1',
      image: 'https://example.com/image.jpg',
      title: 'Welcome',
      subtitle: 'Your subtitle here',
    },
  ];

  return <HeroSlider slides={slides} />;
}
```

---

## Integration Scenarios

### Scenario 1: Music Artist Portfolio

Create a portfolio page showcasing music, events, and contact information:

```tsx
import HeroSlider from '@/components/HeroSlider';
import FeaturedMusicCarousel from '@/components/FeaturedMusicCarousel';
import AudioPlayer from '@/components/AudioPlayer';
import EventCarousel from '@/components/EventCarousel';
import LinksShowcase from '@/components/LinksShowcase';
import CreatorInfoCard from '@/components/CreatorInfoCard';

export default function ArtistPortfolio() {
  return (
    <div className="space-y-16">
      {/* Hero Banner */}
      <HeroSlider slides={heroData} />

      {/* Latest Music */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Latest Releases</h2>
        <FeaturedMusicCarousel cards={musicCards} />
      </section>

      {/* Listen Now */}
      <section className="py-16 bg-card/30">
        <h2 className="text-3xl font-bold mb-8">Now Playing</h2>
        <AudioPlayer tracks={tracks} expanded={true} />
      </section>

      {/* Upcoming Shows */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Tour Dates</h2>
        <EventCarousel events={events} />
      </section>

      {/* Connect */}
      <section className="py-16 bg-card/30">
        <h2 className="text-3xl font-bold mb-8">Connect With Me</h2>
        <LinksShowcase links={links} />
      </section>

      {/* Booking */}
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Booking Info</h2>
        <div className="max-w-sm">
          <CreatorInfoCard creator={creatorInfo} />
        </div>
      </section>
    </div>
  );
}
```

### Scenario 2: Video Production Studio

Showcase video work and services:

```tsx
import HeroSlider from '@/components/HeroSlider';
import VideoPlaylistModule from '@/components/VideoPlaylistModule';
import MediaShowcaseGrid from '@/components/MediaShowcaseGrid';
import LinksShowcase from '@/components/LinksShowcase';

export default function StudioPortfolio() {
  return (
    <div className="space-y-16">
      <HeroSlider slides={heroData} />

      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Work</h2>
        <VideoPlaylistModule videos={videos} />
      </section>

      <section className="py-16 bg-card/30">
        <h2 className="text-3xl font-bold mb-8">Portfolio</h2>
        <MediaShowcaseGrid items={mediaItems} />
      </section>

      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Services</h2>
        <LinksShowcase links={services} />
      </section>
    </div>
  );
}
```

### Scenario 3: Event Management Platform

Display events and artist information:

```tsx
import EventCarousel from '@/components/EventCarousel';
import CreatorInfoCard from '@/components/CreatorInfoCard';
import LinksShowcase from '@/components/LinksShowcase';

export default function EventsPage() {
  return (
    <div className="space-y-16">
      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Upcoming Events</h2>
        <EventCarousel events={events} />
      </section>

      <section className="py-16 bg-card/30">
        <h2 className="text-3xl font-bold mb-8">Featured Artists</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artists.map(artist => (
            <CreatorInfoCard key={artist.id} creator={artist} />
          ))}
        </div>
      </section>

      <section className="py-16">
        <h2 className="text-3xl font-bold mb-8">Get Involved</h2>
        <LinksShowcase links={ctas} />
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
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap" rel="stylesheet" />
```

Then use in components:

```tsx
<h1 style={{ fontFamily: 'YourFont' }}>Title</h1>
```

### Component Props

All components accept callbacks for custom behavior:

```tsx
<HeroSlider
  slides={slides}
  onSlideChange={(index) => console.log('Slide changed to', index)}
/>

<AudioPlayer
  tracks={tracks}
  onTrackChange={(index) => console.log('Track changed to', index)}
/>

<EventCarousel
  events={events}
  onEventClick={(event) => console.log('Event clicked:', event)}
/>
```

---

## Handling Media URLs

### External URLs (Recommended)

Use CDN URLs for all media:

```tsx
const slides = [
  {
    id: '1',
    image: 'https://cdn.example.com/image.jpg',
    title: 'Title',
  },
];
```

### Local Files (Development Only)

For development, you can use local files:

```tsx
const slides = [
  {
    id: '1',
    image: '/images/hero.jpg', // In public folder
    title: 'Title',
  },
];
```

### Dynamic URLs

Load URLs from an API:

```tsx
const [slides, setSlides] = useState([]);

useEffect(() => {
  fetch('/api/slides')
    .then(res => res.json())
    .then(data => setSlides(data));
}, []);

return <HeroSlider slides={slides} />;
```

---

## Responsive Design

All components are mobile-first responsive. Customize breakpoints in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
}
```

---

## Performance Optimization

### Image Optimization

Use `next/image` or similar for automatic optimization:

```tsx
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  priority
/>
```

### Lazy Loading

Implement intersection observer for components outside viewport:

```tsx
import { useInView } from 'react-intersection-observer';

export default function LazyComponent() {
  const { ref, inView } = useInView({ triggerOnce: true });

  return (
    <div ref={ref}>
      {inView && <HeroSlider slides={slides} />}
    </div>
  );
}
```

### Code Splitting

Import components dynamically:

```tsx
import dynamic from 'next/dynamic';

const HeroSlider = dynamic(() => import('@/components/HeroSlider'));

export default function Page() {
  return <HeroSlider slides={slides} />;
}
```

---

## Accessibility

All components follow WCAG AA standards:

- Keyboard navigation fully supported
- ARIA labels included
- Focus states visible
- Color contrast meets standards
- Animations respect `prefers-reduced-motion`

No additional configuration needed—accessibility is built-in.

---

## Troubleshooting

### Components Not Rendering

**Issue**: Components appear blank or don't render.

**Solution**: Ensure TailwindCSS is properly configured and content paths include component files.

```typescript
// tailwind.config.ts
content: [
  './src/**/*.{js,ts,jsx,tsx}',
  './src/components/**/*.{js,ts,jsx,tsx}', // Add this
]
```

### Styling Issues

**Issue**: Components have incorrect colors or styling.

**Solution**: Verify TailwindCSS color tokens are defined in `index.css`:

```css
:root {
  --background: oklch(0.08 0.01 280);
  --foreground: oklch(0.95 0.01 280);
  /* ... other colors */
}
```

### Animation Not Working

**Issue**: Animations are not smooth or not playing.

**Solution**: Ensure Framer Motion is installed and imported correctly:

```bash
npm install framer-motion
```

### Media Not Loading

**Issue**: Images or videos don't display.

**Solution**: Verify URLs are correct and accessible. Use absolute URLs:

```tsx
image: 'https://example.com/image.jpg' // ✅ Correct
image: '/image.jpg' // ❌ May not work in all contexts
```

---

## Support

For questions or issues:

1. Check the COMPONENT_DOCUMENTATION.md for detailed API reference
2. Review the demo page in the pack for working examples
3. Inspect browser console for error messages
4. Verify all dependencies are installed correctly

---

## Next Steps

After integrating the components:

1. Customize colors and typography to match your brand
2. Add your own media content
3. Implement API integration for dynamic data
4. Test responsive design on mobile devices
5. Optimize images for web
6. Deploy to production

---

**Happy building! The Creator Media Blocks Pack is designed to save you time while maintaining premium quality.**
