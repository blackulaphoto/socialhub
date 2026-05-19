import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Primary video full-width with overlay controls
 * - Playlist thumbnails below with smooth transitions
 * - Active video highlighted with accent border
 * - Responsive: Vertical on mobile, horizontal on desktop
 */

export interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
}

interface VideoPlaylistModuleProps {
  videos: VideoItem[];
  initialVideoIndex?: number;
  onVideoChange?: (index: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoPlaylistModule({
  videos,
  initialVideoIndex = 0,
  onVideoChange,
}: VideoPlaylistModuleProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);

  const currentVideo = videos[currentVideoIndex];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      if (currentVideoIndex < videos.length - 1) {
        handleNextVideo();
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentVideoIndex, videos.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);

  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);
    onVideoChange?.(index);
    setIsPlaying(true);

    // Scroll to active video in playlist
    const playlist = playlistRef.current;
    if (playlist) {
      const activeItem = playlist.children[index] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      handleVideoSelect(currentVideoIndex + 1);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  if (videos.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      {/* Primary Video Player */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full bg-black rounded-lg overflow-hidden shadow-lg"
      >
        {/* Video Container */}
        <div className="relative w-full aspect-video bg-muted">
          <video
            ref={videoRef}
            src={currentVideo.videoUrl}
            poster={currentVideo.thumbnail}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />

          {/* Video Controls Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-between p-4 group"
          >
            {/* Top Controls */}
            <div className="flex justify-between items-start">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <h3 className="text-white font-bold text-lg">{currentVideo.title}</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Bottom Controls */}
            <div className="space-y-3">
              {/* Progress Bar */}
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="w-full h-1 bg-white/30 rounded-full cursor-pointer accent-accent"
              />

              {/* Control Buttons & Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePlayPause}
                    className="p-2 bg-accent text-accent-foreground rounded-full hover:shadow-lg transition-shadow"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur transition-colors"
                    aria-label="Volume"
                  >
                    <Volume2 className="w-5 h-5 text-white" />
                  </motion.button>
                </div>

                <span className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Play Button Center (when paused) */}
          {!isPlaying && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              className="absolute inset-0 flex items-center justify-center group"
            >
              <div className="p-4 bg-accent text-accent-foreground rounded-full shadow-lg group-hover:shadow-xl transition-shadow">
                <Play className="w-8 h-8 ml-1" />
              </div>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Playlist Thumbnails */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Playlist
        </h3>

        <div
          ref={playlistRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {videos.map((video, index) => (
            <motion.button
              key={video.id}
              onClick={() => handleVideoSelect(index)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                index === currentVideoIndex
                  ? 'border-accent shadow-lg'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              {/* Thumbnail */}
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-24 h-14 object-cover"
              />

              {/* Duration Badge */}
              <div className="absolute bottom-1 right-1 bg-black/60 px-2 py-0.5 rounded text-xs text-white font-mono">
                {formatTime(video.duration)}
              </div>

              {/* Play Icon on Hover */}
              {index !== currentVideoIndex && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </motion.div>
              )}

              {/* Active Indicator */}
              {index === currentVideoIndex && isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-accent rounded-lg"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Scrollbar Hide */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
