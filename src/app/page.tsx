'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import Image from 'next/image';

type PlayerState = 'playing' | 'paused' | 'loading';

// Define the structure of a track loaded from JSON
interface Track {
  id: number;
  title: string;
  artist: string;
  filename: string;
  src?: string; // src will be constructed dynamically
}

const loadingMessages = [
  "Summoning the beats from the ether...",
  "Polishing the audio, one pixel at a time...",
  "Just a moment, the hamsters are spinning the wheel!",
  "Buffering, like my brain on Monday mornings...",
  "Preparing your auditory adventure!",
];

const MusicPlayer = () => {
  const [playerState, setPlayerState] = useState<PlayerState>('paused');
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75); // 75% volume
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVolumeHover, setIsVolumeHover] = useState(false);
  const [loopMode, setLoopMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffle, setShuffle] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  // const [isAuthenticated, setIsAuthenticated] = useState(false); // DISABLED FOR TESTING
  // const [showLoginModal, setShowLoginModal] = useState(false); // DISABLED FOR TESTING
  // const [songsPlayed, setSongsPlayed] = useState(0); // DISABLED FOR TESTING
  const [tracks, setTracks] = useState<Track[]>([]); // State to hold tracks from JSON
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // All bars have the same max height
  const barCount = 5;
  const maxBarHeight = 32; // px
  const minBarHeight = maxBarHeight * 0.2; // 6.4px

  const volumeBarRef = useRef<HTMLDivElement>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // If tracks are not loaded yet, or currentTrackIndex is out of bounds, use a placeholder
  const currentTrack = tracks[currentTrackIndex] || { 
    id: 0, 
    title: 'Loading...', 
    artist: '', 
    filename: '', 
    src: '' 
  };

  // Track the latest requested track index for robust loading
  const latestTrackRequest = useRef(0);

  // Fetch tracks from R2 API
  useEffect(() => {
    fetch('/api/tracks')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: { tracks: Track[] }) => {
        setTracks(data.tracks);
      })
      .catch(error => {
        console.error('Could not fetch tracks:', error);
        // Fallback to empty tracks array
        setTracks([]);
      });
  }, []);

  // Toast message on mount (keeping this as requested)
  useEffect(() => { 
    const msg = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
    setToastMessage(msg); 
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Play/pause with robust loading logic
  const handlePlayPause = () => {
    if (playerState === 'loading' || !currentTrack.src) return;
    if (playerState === 'playing') {
      setPlayerState('paused');
    } else {
      setPlayerState('loading');
      latestTrackRequest.current = currentTrackIndex;
    }
  };

  // Update progress as audio plays - FIXED: Added proper dependencies
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack.src) return;
    
    const updateProgress = () => {
      setCurrentTime(audio.currentTime || 0);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };
    const setAudioDuration = () => setDuration(audio.duration || 0);
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioDuration);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioDuration);
    };
  }, [currentTrack.src]); // FIXED: Added currentTrack.src as dependency

  // Play/pause audio when playerState changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack.src) return; // Ensure src is available
    if (playerState === 'playing') {
      audio.play();
    } else if (playerState === 'paused') {
      audio.pause();
    }
  }, [playerState, currentTrack.src]); // Re-run when src changes

  // Seek handler
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    audio.currentTime = percent * duration;
    setProgress(percent * 100);
  };

  // Volume handler
  const handleVolume = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const audio = audioRef.current;
    const bar = volumeBarRef.current;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let percent = x / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    audio.volume = percent;
    setVolume(percent * 100);
  };

  // Volume drag handlers
  const handleVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    handleVolume(e);
  };

  const handleVolumeMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingVolume) {
      handleVolume(e);
    }
  }, [isDraggingVolume]);

  const handleVolumeMouseUp = useCallback(() => {
    setIsDraggingVolume(false);
  }, []);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDraggingVolume) {
      document.addEventListener('mousemove', handleVolumeMouseMove);
      document.addEventListener('mouseup', handleVolumeMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleVolumeMouseMove);
        document.removeEventListener('mouseup', handleVolumeMouseUp);
      };
    }
  }, [isDraggingVolume, handleVolumeMouseMove, handleVolumeMouseUp]);

  // Handle next/prev with robust loading logic
  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    setPlayerState('loading');
    setCurrentTrackIndex((prev) => {
      const nextIndex = (prev + 1) % tracks.length;
      latestTrackRequest.current = nextIndex;
      return nextIndex;
    });
  }, [tracks.length]);

  const handlePrev = () => {
    if (tracks.length === 0) return;
    setPlayerState('loading');
    setCurrentTrackIndex((prev) => {
      const prevIndex = (prev - 1 + tracks.length) % tracks.length;
      latestTrackRequest.current = prevIndex;
      return prevIndex;
    });
  };
  
  const handleLoopToggle = () => {
    setLoopMode((prev) => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  };
  const handleShuffleToggle = () => {
    setShuffle((prev) => !prev);
  };

  // Auto-advance or loop on track end - FIXED: Consolidated into single useEffect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return; // Ensure audio and tracks are available
    
          const handleEnded = () => {
        // setSongsPlayed(prev => prev + 1); // Increment songs played count - DISABLED FOR TESTING
      
      if (loopMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (shuffle) {
        // Pick a random track (not the current one)
        let nextIndex = currentTrackIndex;
        while (tracks.length > 1 && nextIndex === currentTrackIndex) {
          nextIndex = Math.floor(Math.random() * tracks.length);
        }
        setCurrentTrackIndex(nextIndex);
        setPlayerState('playing');
      } else if (loopMode === 'all') {
        if (currentTrackIndex === tracks.length - 1) {
          setCurrentTrackIndex(0);
          setPlayerState('playing');
        } else {
          handleNext();
        }
      } else {
        // loopMode === 'off'
        if (currentTrackIndex < tracks.length - 1) {
          handleNext();
        } else {
          setPlayerState('paused');
        }
      }
    };
    
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [loopMode, shuffle, tracks.length, currentTrackIndex, handleNext]); // FIXED: Removed duplicate dependencies

  // Only play when canplay and latest request matches
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack.src) return;

    const handleCanPlay = () => {
      if (playerState === 'loading' && latestTrackRequest.current === currentTrackIndex) {
        setPlayerState('playing');
        audio.play();
      }
    };
    audio.addEventListener('canplay', handleCanPlay);
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentTrack.src, playerState, currentTrackIndex]);

  // When track changes, set to loading if we were playing
  useEffect(() => {
    if (playerState === 'playing') {
      setPlayerState('loading');
      latestTrackRequest.current = currentTrackIndex;
    }
    // eslint-disable-next-line
  }, [currentTrackIndex]);

  // Check if user needs to login (after 2 songs) - DISABLED FOR TESTING
  // useEffect(() => {
  //   if (songsPlayed >= 2 && !isAuthenticated) {
  //     setShowLoginModal(true);
  //   }
  // }, [songsPlayed, isAuthenticated]);

  // Handle dummy login - DISABLED FOR TESTING
  // const handleLogin = () => {
  //   setIsAuthenticated(true);
  //   setShowLoginModal(false);
  //   localStorage.setItem('musicPlayerAuthenticated', 'true');
  // };

  // Check for existing authentication on mount - DISABLED FOR TESTING
  // useEffect(() => {
  //   const authenticated = localStorage.getItem('musicPlayerAuthenticated') === 'true';
  //   if (authenticated) {
  //     setIsAuthenticated(true);
  //   }
  // }, []);

  // Sync audio.muted with state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  // Container animation variants
  const containerVariants: Variants = {
    playing: {
      backgroundColor: '#1a1a1a',
      // Animate boxShadow to create a pulsating/breathing effect
      boxShadow: [
        // Brighter state (start/end of cycle)
        '0px 4px 20px rgba(168, 114, 250, 0.5), 0px 10px 40px rgba(168, 114, 250, 0.3), 0px 0px 80px rgba(168, 114, 250, 0.1)', 
        // Slightly darker/less intense state (middle of cycle)
        '0px 4px 10px rgba(168, 114, 250, 0.2), 0px 10px 20px rgba(168, 114, 250, 0.1), 0px 0px 40px rgba(168, 114, 250, 0.05)', 
        // Back to brighter (completes the loop)
        '0px 4px 20px rgba(168, 114, 250, 0.5), 0px 10px 40px rgba(168, 114, 250, 0.3), 0px 0px 80px rgba(168, 114, 250, 0.1)'  
      ],
      transition: {
        // Specific transition for boxShadow animation
        boxShadow: {
          duration: 3, // Duration of one full pulse cycle (e.g., 3 seconds)
          ease: 'easeInOut', // Smooth start and end
          repeat: Infinity, // Repeat indefinitely
          repeatType: 'reverse', // Go back and forth (bright -> dark -> bright)
        },
        backgroundColor: { duration: 0.3, ease: 'easeInOut' } // Keep existing transition for background
      }
    },
    paused: {
      backgroundColor: '#0f0f0f',
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.6), 0px 10px 40px rgba(0, 0, 0, 0.4)',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    loading: {
      backgroundColor: '#0f0f0f',
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.6), 0px 10px 40px rgba(0, 0, 0, 0.4)',
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  };
  
  // Album artwork animation variants
  const albumVariants: Variants = {
    playing: {
      scale: 1,
      opacity: 1,
      rotate: [0, 360],
      transition: {
        scale: { duration: 0.3, type: 'spring' },
        opacity: { duration: 0.3 },
        rotate: { 
          duration: 20, 
          ease: 'linear', 
          repeat: Infinity,
          repeatType: 'loop'
        }
      }
    },
    paused: {
      scale: 0.95,
      opacity: 1,
      rotate: 0, // Return to original position
      transition: {
        scale: { duration: 0.3, type: 'spring' },
        opacity: { duration: 0.3 },
        rotate: { duration: 0.5, ease: 'easeOut' } // Smooth return to 0
      }
    },
    loading: {
      scale: 0.9,
      opacity: 0.5,
      rotate: 0, // Stop rotation, return to original position
      transition: {
        scale: { duration: 0.3, type: 'spring' },
        opacity: { duration: 0.3 },
        rotate: { duration: 0.3, ease: 'easeOut' }
      }
    }
  };

  // Equalizer bar animation variants (all bars same height)
  const barVariants: Variants = {
    playing: (custom: number) => ({
      height: [minBarHeight, maxBarHeight, minBarHeight],
      backgroundColor: '#8b5cf6',
      opacity: 1,
      transition: {
        height: {
          duration: 0.5,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          delay: custom * 0.1
        }
      }
    }),
    paused: {
      height: minBarHeight,
      backgroundColor: '#8b5cf6',
      opacity: 1,
      transition: { 
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    loading: {
      height: maxBarHeight * 0.5,
      backgroundColor: '#8b5cf6',
      opacity: 0.5,
      transition: { 
        duration: 0.3,
        ease: 'easeOut' 
      }
    }
  };

  // Play button variants
  const playButtonVariants: Variants = {
    playing: {
      backgroundColor: '#8b5cf6',
      scale: 1,
      transition: { duration: 0.3 }
    },
    paused: {
      backgroundColor: '#8b5cf6',
      scale: 1,
      transition: { duration: 0.3 }
    },
    loading: {
      backgroundColor: '#6b7280',
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative">
      {/* Toast at the top center */}
      {toastMessage && (
        <div className="fixed left-1/2 z-50 transform -translate-x-1/2" style={{ top: '6vh' }}>
          <div className="bg-[#18181b] text-white px-3 py-1.5 rounded-md text-xs font-normal"
            style={{
              boxShadow: '0 0 8px 2px rgba(139,92,246,0.18), 0 0 0 1px #6d28d9',
              border: '1px solid #23232b',
              minWidth: '140px',
              textAlign: 'center',
            }}
          >
            {toastMessage}
          </div>
        </div>
      )}
      {currentTrack.src && (
        <audio
          ref={audioRef}
          src={currentTrack.src}
          preload="auto"
        />
      )}
      <motion.div
        className="relative w-full rounded-2xl"
        style={{
          maxWidth: 'clamp(320px, 90vw, 500px)',
          padding: 'clamp(8px, 3vw, 24px)',
          backgroundColor: '#0f0f0f'
        }}
        variants={containerVariants}
        animate={playerState}
        initial="paused"
      >
        <div className="flex flex-col">
          {/* Song Info Section - Album Art + Text + Equalizer as a single block */}
          <div className="flex flex-col" style={{ paddingBottom: 'clamp(8px, 2vw, 24px)' }}>
            {/* Album Art + Song Details Row */}
            <div className="flex items-center" style={{ gap: 'clamp(8px, 4vw, 32px)' }}>
              {/* Album Artwork */}
              <motion.div
                className="relative flex-shrink-0 overflow-hidden rounded-xl"
                style={{
                  width: 'clamp(56px, 24vw, 120px)',
                  height: 'clamp(56px, 24vw, 120px)',
                  background: 'linear-gradient(127.48deg, #7c3aed, #db2777)'
                }}
                variants={albumVariants}
                animate={playerState}
              >
                <Image
                  src="/AlbumArt.png"
                  alt="Album Art"
                  style={{
                    position: 'absolute',
                    top: '25%',
                    left: '30%',
                    width: '40%',
                    height: '40%',
                    objectFit: 'contain'
                  }}
                  width={48}
                  height={48}
                  priority
                />
              </motion.div>
              {/* Right side - Song Details */}
              <div className="flex-1 flex flex-col justify-start">
                <div className="flex flex-col" style={{ gap: '4px' }}>
                  <h1 
                    className="text-lg-semibold"
                    style={{
                      color: '#f5f5f5'
                    }}
                  >
                    {currentTrack.title}
                  </h1>
                  <p 
                    className="text-sm-regular"
                    style={{
                      color: '#a4a7ae'
                    }}
                  >
                    {currentTrack.artist}
                  </p>
                </div>
              </div>
            </div>
            {/* Equalizer Bars Row (directly below album art + text) */}
            <div className="flex justify-start" style={{ paddingLeft: '144px', marginTop: '20px' }}>
              <div 
                className="flex items-end justify-start"
                style={{
                  height: `${maxBarHeight}px`,
                  width: '56px',
                  gap: '4px'
                }}
              >
                {Array.from({ length: barCount }).map((_, index) => (
                  <motion.div
                    key={index}
                    style={{
                      width: '8px',
                      backgroundColor: '#8b5cf6'
                    }}
                    variants={barVariants}
                    custom={index}
                    animate={playerState}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div 
            className="relative rounded-full overflow-hidden cursor-pointer"
            style={{
              height: '8px',
              backgroundColor: '#252b37',
              marginTop: '8px'
            }}
            onClick={handleSeek}
          >
            <motion.div
              className="absolute top-0 left-0 h-full"
              style={{
                borderRadius: '9999px 0px 0px 9999px',
                backgroundColor: playerState === 'playing' ? '#8b5cf6' : '#717680',
                width: `${progress}%`,
                opacity: playerState === 'loading' ? 0.5 : 1
              }}
              initial={{ width: '30%' }}
              animate={{ 
                width: `${progress}%`,
                backgroundColor: playerState === 'playing' ? '#8b5cf6' : '#717680',
                opacity: playerState === 'loading' ? 0.5 : 1
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Time Info */}
          <div className="flex justify-between items-center" style={{ marginTop: '16px' }}>
            <span 
              className="text-xs-regular"
              style={{ color: '#717680' }}
            >
              {formatTime(currentTime)}
            </span>
            <span 
              className="text-xs-regular"
              style={{ color: '#717680' }}
            >
              {formatTime(duration)}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center mt-4" style={{ gap: 'clamp(8px, 2vw, 16px)' }}>
            {/* Shuffle Button */}
            <motion.button
              className="flex items-center justify-center rounded-md border transition-colors"
              style={{
                width: 'clamp(32px, 6vw, 40px)',
                height: 'clamp(32px, 6vw, 40px)',
                color: shuffle ? '#8b5cf6' : '#717680',
                backgroundColor: shuffle ? 'rgba(139,92,246,0.1)' : 'transparent',
                borderColor: shuffle ? '#8b5cf6' : 'transparent',
              }}
              whileHover={{ 
                scale: 1.05,
                color: '#ffffff',
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              whileTap={{ 
                scale: 0.95,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              onClick={handleShuffleToggle}
              title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} />
            </motion.button>

            {/* Previous Button */}
            <motion.button
              className="flex items-center justify-center rounded-md border border-transparent transition-colors"
              style={{
                width: 'clamp(32px, 6vw, 40px)',
                height: 'clamp(32px, 6vw, 40px)',
                color: '#717680',
              }}
              whileHover={{ 
                scale: 1.05,
                color: '#ffffff',
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              whileTap={{ 
                scale: 0.95,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              onClick={handlePrev}
            >
              <SkipBack style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} />
            </motion.button>

            {/* Play/Pause Button */}
            <motion.button
              className="flex items-center justify-center rounded-full shadow-lg transition-all duration-300"
              style={{
                width: 'clamp(48px, 12vw, 64px)',
                height: 'clamp(48px, 12vw, 64px)',
              }}
              variants={playButtonVariants}
              animate={playerState}
              whileHover={{ 
                scale: 1.05,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              whileTap={{ 
                scale: 0.95,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              onClick={handlePlayPause}
              disabled={playerState === 'loading'}
            >
              <AnimatePresence mode="wait">
                {playerState === 'loading' ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} className="text-white animate-spin" />
                    </motion.div>
                  </motion.div>
                ) : playerState === 'playing' ? (
                  <motion.div
                    key="pause"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Pause className="text-white" style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Play className="text-white" style={{ marginLeft: '2px', width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Next Button */}
            <motion.button
              className="flex items-center justify-center rounded-md border border-transparent transition-colors"
              style={{
                width: 'clamp(32px, 6vw, 40px)',
                height: 'clamp(32px, 6vw, 40px)',
                color: '#717680',
              }}
              whileHover={{ 
                scale: 1.05,
                color: '#ffffff',
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              whileTap={{ 
                scale: 0.95,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              onClick={handleNext}
            >
              <SkipForward style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} />
            </motion.button>

            {/* Repeat Button */}
            <motion.button
              className="flex items-center justify-center rounded-md border transition-colors"
              style={{
                width: 'clamp(32px, 6vw, 40px)',
                height: 'clamp(32px, 6vw, 40px)',
                color: loopMode !== 'off' ? '#8b5cf6' : '#717680',
                backgroundColor: loopMode !== 'off' ? 'rgba(139,92,246,0.1)' : 'transparent',
                borderColor: loopMode !== 'off' ? '#8b5cf6' : 'transparent',
              }}
              whileHover={{ 
                scale: 1.05,
                color: '#ffffff',
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              whileTap={{ 
                scale: 0.95,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
              }}
              onClick={handleLoopToggle}
              title={loopMode === 'off' ? 'Loop Off' : loopMode === 'all' ? 'Loop All' : 'Loop One'}
            >
              {loopMode === 'one' ? <Repeat1 style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} /> : <Repeat style={{ width: 'clamp(16px, 2vw, 20px)', height: 'clamp(16px, 2vw, 20px)' }} />}
            </motion.button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2" style={{ marginTop: '16px' }}>
            <button
              onClick={() => setMuted((m) => !m)}
              style={{
                color: muted ? '#8b5cf6' : '#717680',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 0
              }}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div
              ref={volumeBarRef}
              className="flex-1 relative rounded-full overflow-hidden cursor-pointer"
              style={{
                height: '4px',
                backgroundColor: '#252b37'
              }}
              onClick={handleVolume}
              onMouseDown={handleVolumeMouseDown}
              onMouseEnter={() => setIsVolumeHover(true)}
              onMouseLeave={() => setIsVolumeHover(false)}
            >
              <motion.div
                className="absolute top-0 left-0 h-full"
                style={{
                  width: `${volume}%`,
                  backgroundColor: isVolumeHover ? '#8b5cf6' : '#717680',
                  borderRadius: '9999px 0px 0px 9999px'
                }}
                animate={{ backgroundColor: isVolumeHover ? '#8b5cf6' : '#717680' }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Login Modal - DISABLED FOR TESTING */}
      {/* <AnimatePresence>
        {showLoginModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Login Required
                </h2>
                <p className="text-gray-300 mb-6">
                  You&apos;ve listened to 2 songs. Please login to continue enjoying music.
                </p>
                <motion.button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                  onClick={handleLogin}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Login
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence> */}
    </div>
  );
};

const Home = () => {
  return <MusicPlayer />;
};

export default Home;

// Helper to format time
function formatTime(sec: number) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}