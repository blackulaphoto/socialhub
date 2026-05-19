# Library Structure

This document explains the organization of the Creator Media Blocks Pack and how to use it in your projects.

---

## Directory Overview

```
creator-media-blocks/
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
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── ComponentShowcase.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   └── index.html
├── README.md
├── COMPONENT_DOCUMENTATION.md
├── INTEGRATION_GUIDE.md
├── ACCESSIBILITY_GUIDE.md
├── PRODUCTION_STATUS.md
└── package.json
```

---

## Core Library (`src/`)

The `src/` directory contains the reusable component library. This is what you should copy into your projects.

### `src/components/`

Eight self-contained React components, each in its own file:

- **HeroSlider.tsx** — Full-bleed hero section with slides, navigation, and CTA
- **AudioPlayer.tsx** — Audio playback with play/pause, progress, volume control
- **FeaturedMusicCarousel.tsx** — Horizontal scrolling carousel for music/albums
- **VideoPlaylistModule.tsx** — Video player with playlist switcher
- **MediaShowcaseGrid.tsx** — Responsive grid for images/videos
- **LinksShowcase.tsx** — Rich cards for portfolio, store, contact links
- **EventCarousel.tsx** — Carousel for events with dates, locations, tags
- **CreatorInfoCard.tsx** — Compact card with creator availability and pricing

Each component:
- Is fully self-contained (no external dependencies beyond React, Tailwind, Framer Motion)
- Exports TypeScript interfaces for props
- Includes design philosophy comments
- Uses Tailwind CSS for styling
- Includes Framer Motion animations

### `src/types/index.ts`

Shared TypeScript type definitions used across components. Includes:
- Component prop interfaces
- Data structure types (Track, Video, Event, etc.)
- Callback function signatures

### `src/index.ts`

**Main export file** for the library. Re-exports all components and types:

```ts
export { default as HeroSlider } from './components/HeroSlider';
export { default as AudioPlayer } from './components/AudioPlayer';
// ... etc
export * from './types';
```

When integrating this library into your project, you'll import from `src/index.ts`.

---

## Demo Application (`client/`)

The `client/` directory contains a demo/showcase application that displays all components in action. This is **not part of the library** — it's for demonstration purposes only.

### `client/src/pages/ComponentShowcase.tsx`

A single-page demo showcasing all 8 components with example data. This page:
- Displays each component with realistic example data
- Shows responsive behavior
- Demonstrates component props and callbacks
- Serves as a reference for integration

### `client/src/App.tsx`

Routes to the ComponentShowcase page. The app is minimal and focused on showcasing components.

### `client/src/index.css`

Global styles including:
- Tailwind CSS configuration
- Dark editorial color palette
- Typography system
- CSS variables for theming

### `client/index.html`

HTML entry point with:
- Google Fonts imports
- Meta tags for responsiveness
- Root div for React mounting

---

## Documentation Files

### README.md

High-level overview of the library, quick start guide, and key features. Start here for a general understanding.

### COMPONENT_DOCUMENTATION.md

Detailed API reference for each component, including:
- Complete prop interfaces
- Usage examples
- Customization options
- Known limitations
- Accessibility notes

### INTEGRATION_GUIDE.md

Step-by-step instructions for integrating the library into existing projects:
- Installation steps
- Dependency setup
- Tailwind configuration
- Troubleshooting common issues

### ACCESSIBILITY_GUIDE.md

Comprehensive accessibility information:
- Current accessibility status for each component
- WCAG compliance notes
- Recommendations for improvement
- Testing checklist

### PRODUCTION_STATUS.md

Honest assessment of production readiness:
- What works well
- Known limitations
- Testing status
- Recommendations before production use

### LIBRARY_STRUCTURE.md

This file. Explains the project organization and how to use the library.

---

## How to Use This Library

### Option 1: Copy Components Into Your Project

```bash
# Copy the library source
cp -r creator-media-blocks/src/components your-project/src/components/media-blocks
cp -r creator-media-blocks/src/types your-project/src/types/media-blocks
```

Then import components directly:

```tsx
import { HeroSlider } from '@/components/media-blocks';
```

### Option 2: Install as npm Package (Future)

Once published to npm, you'll be able to:

```bash
npm install creator-media-blocks
```

Then import:

```tsx
import { HeroSlider, AudioPlayer } from 'creator-media-blocks';
```

### Option 3: Use the Demo App

Run the demo locally to see all components in action:

```bash
npm run dev
```

Visit `http://localhost:3000` to see the ComponentShowcase page.

---

## Dependency Map

### Core Dependencies (Required)

- **react** (19+) — UI framework
- **react-dom** (19+) — React rendering
- **tailwindcss** (4+) — Styling
- **framer-motion** — Animations
- **lucide-react** — Icons
- **embla-carousel-react** — Carousel functionality

### Development Dependencies

- **typescript** — Type checking
- **vite** — Build tool
- **@vitejs/plugin-react** — Vite React support
- **tailwindcss** — Tailwind CSS processing

### Optional (For Demo App)

- **wouter** — Client-side routing (demo only)
- **next-themes** — Theme provider (demo only)

---

## File Sizes

**Approximate bundle sizes (gzipped):**

- Single component: ~2-3KB
- All 8 components: ~15-18KB
- With dependencies: ~80-100KB (depends on what's already in your project)

---

## Customization Points

### Colors

Update Tailwind theme in your `tailwind.config.ts`:

```ts
export default {
  theme: {
    extend: {
      colors: {
        'editorial-dark': '#0F0F0F',
        'editorial-text': '#F5F5F5',
      }
    }
  }
}
```

### Typography

Update fonts in your HTML or CSS:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### Animations

Framer Motion settings are hardcoded in components. To customize, modify the component files directly.

---

## Development Workflow

### Adding a New Component

1. Create a new file in `src/components/`
2. Define prop interface in `src/types/index.ts`
3. Export from `src/index.ts`
4. Add demo to `client/src/pages/ComponentShowcase.tsx`
5. Document in `COMPONENT_DOCUMENTATION.md`

### Modifying Existing Components

1. Edit the component file in `src/components/`
2. Update types if props change
3. Update documentation
4. Test in the demo app

### Testing

Run the demo app to visually test components:

```bash
npm run dev
```

No automated tests are currently included. Consider adding Jest/Vitest for production use.

---

## Deployment

### Demo App

The demo app can be deployed as a static site:

```bash
npm run build
```

This generates a `dist/` directory with static files ready for deployment.

### Library

To publish the library to npm:

1. Update version in `package.json`
2. Build: `npm run build`
3. Publish: `npm publish`

(Currently not published to npm)

---

## Troubleshooting

### Components Not Styling Correctly

Ensure Tailwind CSS is configured in your project and the content glob includes component files.

### Animations Not Working

Verify Framer Motion is installed: `npm install framer-motion`

### TypeScript Errors

Ensure TypeScript is configured to include the component files in `tsconfig.json`:

```json
{
  "include": ["src/**/*", "src/components/media-blocks/**/*"]
}
```

---

## Summary

The Creator Media Blocks Pack is organized into:
- **Library core** (`src/`) — Reusable components and types
- **Demo app** (`client/`) — Showcase and reference
- **Documentation** — Guides and API reference

To use the library, copy the `src/` directory into your project and follow the INTEGRATION_GUIDE.md for setup instructions.
