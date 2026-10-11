import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, FastForward, Play } from 'lucide-react';

const INTRO_STORAGE_KEY = 'pehchaan_intro_seen_v1';

export function IntroVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  // Sound ALWAYS ON by default as requested
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-detect whether user is on phone (9:16 portrait) or laptop/PC (16:9 landscape)
  const checkIsMobilePortrait = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: portrait)').matches || window.innerWidth <= 768;
  };

  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobilePortrait);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startIntro = () => {
    setIsFadingOut(false);
    setCanSkip(false);
    setSecondsRemaining(5);
    setIsMuted(false);
    setIsMobile(checkIsMobilePortrait());
    setIsOpen(true);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if visiting admin area (do not show intro on admin portal)
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }

    const hasSeen = localStorage.getItem(INTRO_STORAGE_KEY);
    const forceIntro = window.location.search.includes('intro') || window.location.search.includes('replay');

    if (!hasSeen || forceIntro) {
      startIntro();
    }

    // Expose global triggers for testing
    (window as any).replayIntroVideo = startIntro;
    (window as any).resetIntroVideo = () => {
      localStorage.removeItem(INTRO_STORAGE_KEY);
      startIntro();
    };

    const handleReplayEvent = () => startIntro();
    window.addEventListener('pehchaan_replay_intro', handleReplayEvent);

    const handleOrientationChange = () => {
      setIsMobile(checkIsMobilePortrait());
    };
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('pehchaan_replay_intro', handleReplayEvent);
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // 5-second countdown timer for Skip button
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Track if user explicitly clicked the mute button
  const userManuallyMutedRef = useRef(false);

  // Autoplay with Sound ALWAYS ON by default
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const video = videoRef.current;
    video.currentTime = 0;
    video.volume = 1.0;
    userManuallyMutedRef.current = false;
    video.muted = false;
    setIsMuted(false);

    const tryPlayWithSound = async () => {
      try {
        video.volume = 1.0;
        video.muted = false;
        await video.play();
        setIsMuted(false);
        setIsPlaying(true);
      } catch (err) {
        // If mobile/desktop browser enforces autoplay restriction before gesture:
        try {
          video.muted = true;
          await video.play();
          setIsPlaying(true);

          // Listen for first interaction anywhere on window to immediately turn sound ON
          const unmuteOnGesture = () => {
            if (videoRef.current && !userManuallyMutedRef.current) {
              videoRef.current.volume = 1.0;
              videoRef.current.muted = false;
              setIsMuted(false);
            }
            window.removeEventListener('click', unmuteOnGesture, { capture: true });
            window.removeEventListener('touchstart', unmuteOnGesture, { capture: true });
            window.removeEventListener('pointerdown', unmuteOnGesture, { capture: true });
            window.removeEventListener('keydown', unmuteOnGesture, { capture: true });
          };

          window.addEventListener('click', unmuteOnGesture, { capture: true });
          window.addEventListener('touchstart', unmuteOnGesture, { capture: true });
          window.addEventListener('pointerdown', unmuteOnGesture, { capture: true });
          window.addEventListener('keydown', unmuteOnGesture, { capture: true });
        } catch {
          /* ignore play errors */
        }
      }
    };

    tryPlayWithSound();
  }, [isOpen, isMobile]);

  const handleClose = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);

    // Save seen state in localStorage
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {
      /* ignore storage errors */
    }

    if (videoRef.current) {
      videoRef.current.pause();
    }

    setTimeout(() => {
      setIsOpen(false);
      setIsFadingOut(false);
    }, 450);
  };

  // Only mutes when user explicitly clicks the mute button!
  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    userManuallyMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    // If video is currently muted (by browser restriction), first tap unmutes sound!
    if (videoRef.current.muted) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      userManuallyMutedRef.current = false;
      setIsMuted(false);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    // Otherwise toggle play/pause
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  if (!isOpen) return null;

  const currentVideoSrc = isMobile ? '/intro-mobile.mp4' : '/intro-desktop.mp4';

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Welcome Intro Video"
    >
      {/* Main Video Player - 9:16 on Mobile, 16:9 on Desktop/Laptop */}
      <video
        key={isMobile ? 'mobile-9-16' : 'desktop-16-9'}
        ref={videoRef}
        src={currentVideoSrc}
        className="w-full h-full max-h-screen max-w-full object-contain bg-black cursor-pointer select-none"
        playsInline
        autoPlay
        preload="auto"
        onClick={handleVideoClick}
        onEnded={handleClose}
      >
        <source src="/intro-mobile.mp4" type="video/mp4" media="(orientation: portrait)" />
        <source src="/intro-desktop.mp4" type="video/mp4" media="(orientation: landscape)" />
        <source src={currentVideoSrc} type="video/mp4" />
      </video>

      {/* Top Floating Controls - Minimalist, no dark strip covering the video */}
      <div className="absolute top-3 left-3 right-3 md:top-4 md:left-5 md:right-5 flex items-center justify-between pointer-events-none z-10">
        {/* Left: Sound Toggle - Default Sound ON, user can mute anytime */}
        <div className="pointer-events-auto">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border text-[11px] font-semibold transition-all duration-200 cursor-pointer shadow-md ${
              !isMuted
                ? 'bg-black/50 hover:bg-black/70 border-emerald-500/40 text-emerald-400'
                : 'bg-black/55 hover:bg-black/75 border-white/20 text-white/50'
            }`}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {!isMuted ? (
              <>
                <Volume2 size={14} className="text-emerald-400 animate-pulse" />
                <span>Sound On</span>
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-white/60" />
                <span>Muted</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Flat, Faded, Subtle Skip Button (Not bright, blends naturally) */}
        <div className="pointer-events-auto">
          {!canSkip ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm border border-white/10 text-white/40 text-[11px] font-normal select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block" />
              <span>Skip in {secondsRemaining}s</span>
            </div>
          ) : (
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 hover:bg-black/60 active:bg-black/80 backdrop-blur-md border border-white/20 text-white/75 hover:text-white text-xs font-medium transition-all duration-200 cursor-pointer select-none animate-in fade-in"
              aria-label="Skip intro video"
            >
              <span>Skip</span>
              <FastForward size={12} className="opacity-70" />
            </button>
          )}
        </div>
      </div>

      {/* Paused Overlay Indicator */}
      {!isPlaying && (
        <div
          onClick={handleVideoClick}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform">
            <Play size={28} className="translate-x-0.5 fill-white/30" />
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-[11px] text-white/60 tracking-wider font-light">
          {isMuted ? 'Tap anywhere to turn Sound ON 🔊 • Video closes automatically when finished' : 'Tap anywhere to pause • Video closes automatically when finished'}
        </p>
      </div>
    </div>
  );
}
