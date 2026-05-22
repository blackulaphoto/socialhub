import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * DESIGN PHILOSOPHY: Dark Editorial Minimalism with Media Prominence
 * - Album art on left with subtle shadow
 * - Controls arranged horizontally with clear hierarchy
 * - Compact and expanded modes for flexibility
 * - Smooth progress bar with hover preview
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverImage?: string;
  url: string;
}

interface AudioPlayerProps {
  tracks: Track[];
  initialTrackIndex?: number;
  expanded?: boolean;
  onTrackChange?: (index: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  tracks,
  initialTrackIndex = 0,
  expanded = false,
  onTrackChange,
}: AudioPlayerProps) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialTrackIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (currentTrackIndex < tracks.length - 1) {
        handleNextTrack();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [currentTrack, volume, isMuted]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);

  const handlePrevTrack = () => {
    const newIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
    onTrackChange?.(newIndex);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    const newIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(newIndex);
    onTrackChange?.(newIndex);
    setIsPlaying(true);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume : 0;
    }
  };

  if (tracks.length === 0) return null;

  return (
    <div className={`bg-card rounded-lg border border-border overflow-hidden ${expanded ? 'p-6' : 'p-4'}`}>
      <audio ref={audioRef} crossOrigin="anonymous" />

      {expanded ? (
        // Expanded Mode
        <div className="space-y-6">
          {/* Album Art */}
          {currentTrack.coverImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full aspect-square rounded-lg overflow-hidden shadow-lg"
            >
              <img
                src={currentTrack.coverImage}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          )}

          {/* Track Info */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground mb-1">{currentTrack.title}</h3>
            <p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-1 bg-muted rounded-full cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrevTrack}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Previous track"
            >
              <SkipBack className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              className="p-3 bg-accent text-accent-foreground rounded-full hover:shadow-lg transition-shadow"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextTrack}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={toggleMute}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </motion.button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 bg-muted rounded-full cursor-pointer accent-accent"
              aria-label="Volume"
            />
          </div>
        </div>
      ) : (
        // Compact Mode
        <div className="flex items-center gap-4">
          {/* Album Art */}
          {currentTrack.coverImage && (
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
              <img
                src={currentTrack.coverImage}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Track Info & Controls */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>

            {/* Progress Bar */}
            <div className="mt-2">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="w-full h-0.5 bg-muted rounded-full cursor-pointer accent-accent"
              />
            </div>
          </div>

          {/* Compact Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              className="p-2 bg-accent text-accent-foreground rounded-full hover:shadow-lg transition-shadow"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
