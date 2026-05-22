import React from 'react';
import HeroSlider from '@/components/HeroSlider';
import AudioPlayer from '@/components/AudioPlayer';
import FeaturedMusicCarousel from '@/components/FeaturedMusicCarousel';
import VideoPlaylistModule from '@/components/VideoPlaylistModule';
import MediaShowcaseGrid from '@/components/MediaShowcaseGrid';
import LinksShowcase from '@/components/LinksShowcase';
import EventCarousel from '@/components/EventCarousel';
import CreatorInfoCard from '@/components/CreatorInfoCard';

export default function ComponentShowcase() {
  // Hero Slider Data
  const heroSlides = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=600&fit=crop',
      title: 'Studio Sessions',
      subtitle: 'Premium audio production and mixing',
      cta: { text: 'Book Now', href: '#' },
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=600&fit=crop',
      title: 'Live Performances',
      subtitle: 'Experience the energy of live music',
      cta: { text: 'Get Tickets', href: '#' },
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=600&fit=crop',
      title: 'Music Production',
      subtitle: 'Crafting the next generation of hits',
      cta: { text: 'Learn More', href: '#' },
    },
  ];

  // Audio Player Data
  const audioTracks = [
    {
      id: '1',
      title: 'Midnight Dreams',
      artist: 'Luna Echo',
      duration: 243,
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    },
    {
      id: '2',
      title: 'Electric Pulse',
      artist: 'Neon Waves',
      duration: 198,
      coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    },
    {
      id: '3',
      title: 'Cosmic Journey',
      artist: 'Stellar Sounds',
      duration: 267,
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    },
  ];

  // Music Carousel Data
  const musicCards = [
    {
      id: '1',
      title: 'Neon Nights',
      artist: 'Luna Echo',
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    },
    {
      id: '2',
      title: 'Electric Dreams',
      artist: 'Neon Waves',
      coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    },
    {
      id: '3',
      title: 'Stellar Vibes',
      artist: 'Cosmic Sounds',
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    },
    {
      id: '4',
      title: 'Urban Beats',
      artist: 'City Pulse',
      coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    },
    {
      id: '5',
      title: 'Ambient Flow',
      artist: 'Zen Harmonies',
      coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    },
  ];

  // Video Playlist Data
  const videos = [
    {
      id: '1',
      title: 'Studio Session #1',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=200&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/big_buck_bunny.mp4',
      duration: 596,
    },
    {
      id: '2',
      title: 'Live Performance',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/elephant_dream.mp4',
      duration: 653,
    },
    {
      id: '3',
      title: 'Behind the Scenes',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=200&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/for_bigger_blazes.mp4',
      duration: 469,
    },
  ];

  // Media Grid Data
  const mediaItems = [
    {
      id: '1',
      title: 'Studio Ambiance',
      type: 'image' as const,
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop',
      description: 'Professional recording studio setup',
    },
    {
      id: '2',
      title: 'Live Concert',
      type: 'video' as const,
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-library/sample/big_buck_bunny.mp4',
      description: 'Electrifying live performance',
    },
    {
      id: '3',
      title: 'Production Setup',
      type: 'image' as const,
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
      description: 'State-of-the-art production equipment',
    },
    {
      id: '4',
      title: 'Artist Portrait',
      type: 'image' as const,
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
      description: 'Professional artist photography',
    },
    {
      id: '5',
      title: 'Mixing Session',
      type: 'image' as const,
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      description: 'Audio mixing and mastering',
    },
  ];

  // Links Showcase Data
  const links = [
    {
      id: '1',
      title: 'Portfolio',
      description: 'View my work',
      type: 'portfolio' as const,
      href: '#',
    },
    {
      id: '2',
      title: 'Music Store',
      description: 'Buy my music',
      type: 'store' as const,
      href: '#',
    },
    {
      id: '3',
      title: 'Tour Dates',
      description: 'Upcoming shows',
      type: 'tickets' as const,
      href: '#',
    },
    {
      id: '4',
      title: 'Website',
      description: 'Learn more',
      type: 'website' as const,
      href: '#',
    },
    {
      id: '5',
      title: 'Contact',
      description: 'Get in touch',
      type: 'contact' as const,
      href: '#',
    },
    {
      id: '6',
      title: 'Spotify',
      description: 'Listen now',
      type: 'music' as const,
      href: '#',
    },
  ];

  // Events Data
  const events = [
    {
      id: '1',
      title: 'Studio Recording Session',
      date: new Date(2026, 4, 15),
      location: 'Downtown Studio, NYC',
      tags: ['Recording', 'Studio'],
      description: 'Professional recording and mixing session',
      ctaText: 'Book Session',
    },
    {
      id: '2',
      title: 'Live Concert',
      date: new Date(2026, 5, 22),
      location: 'Madison Square Garden, NYC',
      tags: ['Live', 'Concert'],
      description: 'Electrifying live performance',
      ctaText: 'Get Tickets',
    },
    {
      id: '3',
      title: 'Masterclass Workshop',
      date: new Date(2026, 6, 10),
      location: 'Music Academy, LA',
      tags: ['Workshop', 'Education'],
      description: 'Learn production techniques from industry experts',
      ctaText: 'Register Now',
    },
    {
      id: '4',
      title: 'Album Release Party',
      date: new Date(2026, 7, 5),
      location: 'Rooftop Venue, SF',
      tags: ['Release', 'Party'],
      description: 'Celebrate the new album launch',
      ctaText: 'RSVP',
    },
  ];

  // Creator Info Data
  const creator = {
    name: 'Luna Echo',
    title: 'Music Producer & Artist',
    location: 'Los Angeles, CA',
    availability: 'available' as const,
    turnaround: '2-3 weeks',
    basePrice: 500,
    services: ['Production', 'Mixing', 'Mastering', 'Collaboration'],
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    bio: 'Award-winning producer specializing in electronic and indie music',
    ctaText: 'Hire Me',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Slider Section */}
      <section className="w-full">
        <HeroSlider slides={heroSlides} autoplay={true} autoplayInterval={5000} />
      </section>

      {/* Audio Player Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Audio Player
            </h2>
            <p className="text-muted-foreground text-lg">
              Compact and expanded player modes with playlist support
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Compact Mode</h3>
              <AudioPlayer tracks={audioTracks} expanded={false} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Expanded Mode</h3>
              <AudioPlayer tracks={audioTracks} expanded={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Music Carousel Section */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Featured Music Carousel
            </h2>
            <p className="text-muted-foreground text-lg">
              Horizontal scroll with staggered card sizes
            </p>
          </div>

          <FeaturedMusicCarousel cards={musicCards} />
        </div>
      </section>

      {/* Video Playlist Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Video Playlist Module
            </h2>
            <p className="text-muted-foreground text-lg">
              Primary video with interactive playlist
            </p>
          </div>

          <VideoPlaylistModule videos={videos} />
        </div>
      </section>

      {/* Media Showcase Grid Section */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Media Showcase Grid
            </h2>
            <p className="text-muted-foreground text-lg">
              Featured-first layout with lightbox support
            </p>
          </div>

          <MediaShowcaseGrid items={mediaItems} />
        </div>
      </section>

      {/* Links Showcase Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Links Showcase
            </h2>
            <p className="text-muted-foreground text-lg">
              Rich cards for portfolio, store, and contact links
            </p>
          </div>

          <LinksShowcase links={links} />
        </div>
      </section>

      {/* Event Carousel Section */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Event Carousel
            </h2>
            <p className="text-muted-foreground text-lg">
              Date-forward design with location and tags
            </p>
          </div>

          <EventCarousel events={events} />
        </div>
      </section>

      {/* Creator Info Card Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Montserrat' }}>
              Creator Info Card
            </h2>
            <p className="text-muted-foreground text-lg">
              Compact card with availability, pricing, and services
            </p>
          </div>

          <div className="max-w-sm">
            <CreatorInfoCard creator={creator} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container text-center text-muted-foreground">
          <p>Creator Media Blocks Pack — Reusable Component Library</p>
          <p className="text-sm mt-2">Built with React, TypeScript, and TailwindCSS</p>
        </div>
      </footer>
    </div>
  );
}
