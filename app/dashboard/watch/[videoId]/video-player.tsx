"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoChapter {
  id: string;
  title: string;
  start_time: number;
  order_index: number;
}
interface Props {
  videoId: string;
  videoUrl: string | null;
  muxPlaybackId: string | null;
  videoTitle: string;
  courseId: string;
  initialPosition: number;
  isCompleted: boolean;
  modules: any[];
  progressMap: Record<
    string,
    { video_id: string; completed: boolean; last_position: number }
  >;
  mobileSidebar?: React.ReactNode;
  chapters?: VideoChapter[];
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.pathname.startsWith("/embed/"))
      return u.pathname.split("/embed/")[1].split("?")[0];
  } catch {
    /* not a valid URL */
  }
  return null;
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Returns the chapter that is currently active given a playback position */
function getActiveChapter(
  chapters: VideoChapter[],
  currentTime: number,
): VideoChapter | null {
  if (!chapters.length) return null;
  const sorted = [...chapters].sort((a, b) => a.start_time - b.start_time);
  let active: VideoChapter | null = null;
  for (const ch of sorted) {
    if (currentTime >= ch.start_time) active = ch;
    else break;
  }
  return active;
}

const STANDARD_HEIGHTS = [144, 240, 360, 480, 720, 1080, 1440, 2160];
function snapToStandardHeight(h: number): number {
  return STANDARD_HEIGHTS.reduce((best, std) =>
    Math.abs(std - h) < Math.abs(best - h) ? std : best,
  );
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SKIP = 10;

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const IconRewind = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </svg>
);
const IconForward = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
  </svg>
);
const IconVolumeFull = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);
const IconVolumeLow = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
  </svg>
);
const IconVolumeMute = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);
const IconQuality = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM7.5 8H6v8h1.5v-3h3v3H12V8h-1.5v3.5h-3V8zm9.5 0h-3v8h3c1.38 0 2.5-1.12 2.5-2.5v-3C19.5 9.12 18.38 8 17 8zm1 5.5c0 .55-.45 1-1 1h-1.5v-5H17c.55 0 1 .45 1 1v3z" />
  </svg>
);
const IconFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);
const IconExitFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

interface RenditionOption {
  label: string;
  rawHeight: number;
  index: number;
}

// ─── MuxVideoPlayer (Mux-specific player with custom controls + DRM) ──────────
function MuxVideoPlayer({
  playbackId,
  token,
  title,
  startTime,
  chapters,
  onTimeUpdate,
  onEnded,
  onPause,
}: {
  playbackId: string;
  token: string | null;
  title: string;
  startTime: number;
  chapters: VideoChapter[];
  onTimeUpdate: (t: number, dur?: number) => void;
  onEnded: (finalPosition: number) => void;
  onPause: (t: number) => void;
}) {
  const playerRef = useRef<MuxPlayerElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const durationRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualMenu, setShowQualMenu] = useState(false);
  const [dragPct, setDragPct] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [renditions, setRenditions] = useState<RenditionOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [flashSide, setFlashSide] = useState<"left" | "right" | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });

  // ── DRM: disable context menu + right-click save on the video ────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", block);
    return () => el.removeEventListener("contextmenu", block);
  }, []);

  const getVideo = useCallback((): HTMLVideoElement | null => {
    const el = playerRef.current as any;
    if (!el) return null;
    return el.media ?? el.querySelector?.("video") ?? null;
  }, []);

  // ── DRM: set controlsList + disablePictureInPicture on the raw <video> ───
  useEffect(() => {
    const applyDRM = () => {
      const v = getVideo();
      if (!v) return;
      v.setAttribute("controlsList", "nodownload noremoteplayback");
      v.disablePictureInPicture = true;
      v.setAttribute("disablePictureInPicture", "");
      v.oncontextmenu = (e) => e.preventDefault();
    };
    // Apply immediately and after metadata loads (element may not exist yet)
    applyDRM();
    const el = playerRef.current as any;
    if (el) {
      el.addEventListener?.("loadedmetadata", applyDRM);
      return () => el.removeEventListener?.("loadedmetadata", applyDRM);
    }
  }, [getVideo, playbackId]);

  const resetHide = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setPlaying((p) => {
        if (p) setShowControls(false);
        return p;
      });
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = getVideo();
    if (!v) return;
    v.paused ? v.play() : v.pause();
    resetHide();
  }, [getVideo, resetHide]);

  const skip = useCallback(
    (secs: number) => {
      const v = getVideo();
      if (!v) return;
      v.currentTime = Math.max(
        0,
        Math.min(v.duration || 0, v.currentTime + secs),
      );
      resetHide();
    },
    [getVideo, resetHide],
  );

  const seekTo = useCallback(
    (secs: number) => {
      const v = getVideo();
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, secs));
      setCurrentTime(v.currentTime);
      resetHide();
    },
    [getVideo, resetHide],
  );

  const toggleMute = useCallback(() => {
    const v = getVideo();
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, [getVideo]);

  const changeVolume = useCallback(
    (val: number) => {
      const v = getVideo();
      if (!v) return;
      v.volume = val;
      v.muted = val === 0;
      setVolume(val);
      setMuted(val === 0);
    },
    [getVideo],
  );

  const changeSpeed = useCallback(
    (s: number) => {
      const v = getVideo();
      if (!v) return;
      v.playbackRate = s;
      setSpeed(s);
      setShowSpeedMenu(false);
    },
    [getVideo],
  );

  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    const buildRenditions = () => {
      const list = el.videoRenditions;
      if (!list || list.length === 0) return;
      const buckets = new Map<number, RenditionOption>();
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const raw = r.height ?? 0;
        if (raw <= 0) continue;
        const snapped = snapToStandardHeight(raw);
        if (!buckets.has(snapped))
          buckets.set(snapped, {
            label: `${snapped}p`,
            rawHeight: raw,
            index: i,
          });
      }
      setRenditions(
        [...buckets.values()].sort((a, b) => b.rawHeight - a.rawHeight),
      );
      setSelectedIdx(-1);
    };
    const list = el.videoRenditions as any;
    if (list) list.onaddrendition = buildRenditions;
    buildRenditions();
    return () => {
      const l = (el as any).videoRenditions;
      if (l) l.onaddrendition = undefined;
    };
  }, [playbackId]);

  const changeQuality = useCallback((idx: number) => {
    const el = playerRef.current;
    if (!el) return;
    const list = el.videoRenditions as any;
    if (!list) return;
    list.selectedIndex = idx;
    setSelectedIdx(idx);
    setShowQualMenu(false);
  }, []);

  const currentQualLabel =
    selectedIdx === -1
      ? "Auto"
      : (renditions.find((r) => r.index === selectedIdx)?.label ?? "Auto");

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  }, []);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const v = getVideo();
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          skip(-SKIP);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          skip(SKIP);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (v) changeVolume(Math.min(1, v.volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          if (v) changeVolume(Math.max(0, v.volume - 0.1));
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [getVideo, togglePlay, skip, changeVolume, toggleFullscreen, toggleMute]);

  const handleTap = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Don't intercept if already scrubbing the progress bar
      if (isScrubbing) return;
      e.preventDefault();
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.changedTouches[0].clientX - rect.left;
      const side = x < rect.width / 2 ? "left" : "right";
      tapCount.current[side]++;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        const count = tapCount.current[side];
        tapCount.current = { left: 0, right: 0 };
        if (count >= 2) {
          side === "right" ? skip(SKIP) : skip(-SKIP);
          setFlashSide(side);
          setTimeout(() => setFlashSide(null), 600);
        } else setShowControls((s) => !s);
      }, 250);
    },
    [skip, isScrubbing],
  );

  const getPct = useCallback((clientX: number) => {
    const bar = progressRef.current;
    if (!bar) return 0;
    const r = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }, []);

  const handleProgressDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      setIsScrubbing(true);
      setDragPct(getPct(e.clientX));
      resetHide();
      const onMove = (ev: MouseEvent) => {
        if (isDragging.current) {
          setDragPct(getPct(ev.clientX));
          resetHide();
        }
      };
      const onUp = (ev: MouseEvent) => {
        isDragging.current = false;
        setIsScrubbing(false);
        const p = getPct(ev.clientX);
        setDragPct(null);
        const v = getVideo();
        if (v && duration) {
          v.currentTime = p * duration;
          setCurrentTime(p * duration);
        }
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [getPct, getVideo, duration, resetHide],
  );

  const handleProgressTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation(); // prevent handleTap from firing
      isDragging.current = true;
      setIsScrubbing(true);
      const p = getPct(e.touches[0].clientX);
      setDragPct(p);
      resetHide();
      const onMove = (ev: TouchEvent) => {
        ev.preventDefault();
        if (isDragging.current) {
          setDragPct(getPct(ev.touches[0].clientX));
          resetHide();
        }
      };
      const onEnd = (ev: TouchEvent) => {
        isDragging.current = false;
        setIsScrubbing(false);
        const p2 = getPct(ev.changedTouches[0].clientX);
        setDragPct(null);
        const v = getVideo();
        if (v && duration) {
          v.currentTime = p2 * duration;
          setCurrentTime(p2 * duration);
        }
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
      };
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    },
    [getPct, getVideo, duration, resetHide],
  );

  const handleMuxTimeUpdate = useCallback(() => {
    const el = playerRef.current;
    if (!el) return;
    const t = el.currentTime ?? 0;
    const d = isFinite(el.duration) ? el.duration : 0;
    setCurrentTime(t);
    if (d) {
      setDuration(d);
      durationRef.current = d;
    }
    const v = getVideo();
    if (v && v.buffered.length > 0 && d)
      setBuffered((v.buffered.end(v.buffered.length - 1) / d) * 100);
    onTimeUpdate(t, d || undefined);
  }, [getVideo, onTimeUpdate]);

  const handleMuxPlay = useCallback(() => setPlaying(true), []);
  const handleMuxPause = useCallback(() => {
    setPlaying(false);
    onPause(playerRef.current?.currentTime ?? 0);
  }, [onPause]);
  const handleMuxEnded = useCallback(() => {
    setPlaying(false);
    setShowControls(true);
    const finalPos =
      durationRef.current > 0
        ? durationRef.current
        : (playerRef.current?.currentTime ?? 0);
    onEnded(finalPos);
  }, [onEnded]);
  const handleMuxLoaded = useCallback(() => {
    const el = playerRef.current;
    if (!el) return;
    if (isFinite(el.duration)) {
      setDuration(el.duration);
      durationRef.current = el.duration;
    }
  }, []);

  const displayPct =
    dragPct !== null
      ? dragPct * 100
      : duration > 0
        ? (currentTime / duration) * 100
        : 0;
  const displayTime = dragPct !== null ? dragPct * duration : currentTime;
  const activeChapter = getActiveChapter(chapters, currentTime);
  // Chapter that the scrub thumb is hovering over (may differ from activeChapter)
  const scrubChapter =
    dragPct !== null
      ? getActiveChapter(chapters, dragPct * duration)
      : activeChapter;
  const sortedChapters = [...chapters].sort(
    (a, b) => a.start_time - b.start_time,
  );

  // Build per-chapter segment data for the progress bar
  const chapterSegments =
    sortedChapters.length > 0 && duration > 0
      ? sortedChapters.map((ch, i) => {
          const startPct = (ch.start_time / duration) * 100;
          const endPct =
            i + 1 < sortedChapters.length
              ? (sortedChapters[i + 1].start_time / duration) * 100
              : 100;
          const isHovered =
            scrubChapter?.id === ch.id && (isScrubbing || dragPct !== null);
          return { ch, startPct, endPct, isHovered };
        })
      : null;

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none overflow-hidden"
      style={{ aspectRatio: "16/9", touchAction: "none" }}
      onMouseMove={resetHide}
      onMouseLeave={() => {
        if (playing) setShowControls(false);
      }}
      onClick={() => {
        setShowSpeedMenu(false);
        setShowQualMenu(false);
      }}
    >
      {/* DRM: CSS blackout on screenshot — uses the print media query trick */}
      <style>{`
        @media print {
          .mux-drm-container { visibility: hidden !important; }
        }
      `}</style>

      <div className="mux-drm-container absolute inset-0">
        <MuxPlayer
          ref={playerRef}
          playbackId={playbackId}
          {...(token ? { tokens: { playback: token } } : {})}
          startTime={startTime}
          title={title}
          streamType="on-demand"
          preload="auto"
          nohotkeys
          poster=""
          disablePictureInPicture
          style={
            {
              width: "100%",
              height: "100%",
              position: "absolute",
              inset: 0,
              "--controls": "none",
              "--media-object-fit": "contain",
            } as any
          }
          onTimeUpdate={handleMuxTimeUpdate}
          onPlay={handleMuxPlay}
          onPause={handleMuxPause}
          onEnded={handleMuxEnded}
          onLoadedMetadata={handleMuxLoaded}
        />
      </div>

      {/* Touch handler overlay — sits below the progress bar (z-10 vs z-20 for progress) */}
      <div
        className="absolute inset-0 z-10"
        style={{ touchAction: "none" }}
        onTouchEnd={handleTap}
        onClick={(e) => {
          if (e.target === e.currentTarget) togglePlay();
        }}
      />

      {/* Double-tap flash indicators */}
      {flashSide === "left" && (
        <div className="absolute left-0 top-0 bottom-0 w-1/2 z-20 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-white animate-ping-once">
            <svg viewBox="0 0 24 24" fill="white" width="36" height="36">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
            <span className="text-sm font-bold drop-shadow">-{SKIP}s</span>
          </div>
        </div>
      )}
      {flashSide === "right" && (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 z-20 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-white animate-ping-once">
            <svg viewBox="0 0 24 24" fill="white" width="36" height="36">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
            </svg>
            <span className="text-sm font-bold drop-shadow">+{SKIP}s</span>
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 30%, transparent 60%)",
          opacity: showControls ? 1 : 0,
        }}
      />

      {/* Active chapter badge — only show when there are chapters but no name in timestamp row */}

      {/* Center play button */}
      <div
        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-200"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <button
          className="pointer-events-auto w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110 border border-white/20"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-2.5 pt-6 transition-opacity duration-300"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Progress bar ──────────────────────────────────────────────────── */}
        {/* Tall touch-target wrapper — 44px touch area, visuals sit in the middle */}
        <div
          ref={progressRef}
          className="relative w-full mb-3 cursor-pointer z-20"
          style={{ height: 28, touchAction: "none" }}
          onMouseDown={handleProgressDown}
          onTouchStart={handleProgressTouchStart}
          onClick={(e) => {
            if (isDragging.current) return;
            const p = getPct(e.clientX);
            const v = getVideo();
            if (v && duration) {
              v.currentTime = p * duration;
              setCurrentTime(p * duration);
            }
          }}
        >
          {/* Tooltip: chapter name + time — shown while scrubbing or hovering */}
          {(isScrubbing || dragPct !== null) && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                bottom: "100%",
                left: `clamp(8px, ${displayPct}%, calc(100% - 8px))`,
                transform: "translateX(-50%)",
                marginBottom: 8,
              }}
            >
              <div className="flex flex-col items-center gap-0.5">
                {scrubChapter && (
                  <span
                    className="text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap font-semibold border border-white/15"
                    style={{
                      background: "rgba(0,0,0,0.88)",
                      backdropFilter: "blur(6px)",
                      maxWidth: 200,
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {scrubChapter.title}
                  </span>
                )}
                <span
                  className="text-white text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "rgba(0,0,0,0.75)" }}
                >
                  {formatTime(displayTime)}
                </span>
              </div>
            </div>
          )}

          {/* Hover tooltip (desktop only, no dragging) */}
          {!isScrubbing && (
            <div
              className="absolute pointer-events-none z-30 opacity-0 group-hover/prog:opacity-100 transition-opacity"
              style={{
                bottom: "100%",
                left: `clamp(8px, ${displayPct}%, calc(100% - 8px))`,
                transform: "translateX(-50%)",
                marginBottom: 8,
              }}
            >
              <div className="flex flex-col items-center gap-0.5">
                {activeChapter && (
                  <span
                    className="text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap font-semibold border border-white/15"
                    style={{
                      background: "rgba(0,0,0,0.88)",
                      backdropFilter: "blur(6px)",
                      maxWidth: 200,
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeChapter.title}
                  </span>
                )}
                <span
                  className="text-white text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "rgba(0,0,0,0.75)" }}
                >
                  {formatTime(displayTime)}
                </span>
              </div>
            </div>
          )}

          {/* ── Chapter-segmented track (YouTube-style) ──────────────────── */}
          {chapterSegments ? (
            <div
              className="absolute inset-x-0"
              style={{ top: "50%", transform: "translateY(-50%)", height: 20 }}
            >
              {chapterSegments.map(({ ch, startPct, endPct, isHovered }) => {
                const GAP_PX = 2; // gap between segments in px
                const segWidth = endPct - startPct;
                const playedPct = Math.max(
                  0,
                  Math.min(displayPct - startPct, segWidth),
                );
                const filledPct = (playedPct / segWidth) * 100;
                const bufferedPct = Math.max(
                  0,
                  Math.min(((buffered - startPct) / segWidth) * 100, 100),
                );
                const trackH = isHovered ? 5 : 3;
                return (
                  <div
                    key={ch.id}
                    className="absolute"
                    style={{
                      // Each segment occupies its % of width minus a fixed px gap on the right
                      left: `calc(${startPct}% + ${startPct > 0 ? GAP_PX / 2 : 0}px)`,
                      right: `calc(${100 - endPct}% + ${endPct < 100 ? GAP_PX / 2 : 0}px)`,
                      height: 20, // full height of touch zone
                      top: 0,
                    }}
                  >
                    {/* Visual track — vertically centred, height animates */}
                    <div
                      className="absolute inset-x-0 overflow-hidden"
                      style={{
                        height: trackH,
                        bottom: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        borderRadius: 99,
                        background: "rgba(255,255,255,0.25)",
                        transition: "height 0.12s ease",
                      }}
                    >
                      {/* Buffered */}
                      <div
                        className="absolute left-0 top-0 h-full"
                        style={{
                          width: `${bufferedPct}%`,
                          background: "rgba(255,255,255,0.35)",
                        }}
                      />
                      {/* Played */}
                      <div
                        className="absolute left-0 top-0 h-full"
                        style={{
                          width: `${filledPct}%`,
                          background: "#FF7802",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Scrub handle — always on top */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  left: `${displayPct}%`,
                  width: 16,
                  height: 16,
                  background: "#FF7802",
                  boxShadow: "0 0 0 3px rgba(255,120,2,0.35)",
                  opacity: isScrubbing ? 1 : 0,
                  transition: "opacity 0.12s",
                }}
              />
            </div>
          ) : (
            /* Fallback: no chapters — simple single-track bar */
            <div
              className="absolute inset-x-0"
              style={{
                top: "50%",
                height: isScrubbing ? 5 : 3,
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.25)",
                borderRadius: 99,
                transition: "height 0.12s",
                overflow: "hidden",
              }}
            >
              <div
                className="absolute left-0 top-0 h-full"
                style={{
                  width: `${buffered}%`,
                  background: "rgba(255,255,255,0.35)",
                }}
              />
              <div
                className="absolute left-0 top-0 h-full"
                style={{ width: `${displayPct}%`, background: "#FF7802" }}
              />
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: "50%",
                  transform: "translate(-50%,-50%)",
                  left: `${displayPct}%`,
                  width: 16,
                  height: 16,
                  background: "#FF7802",
                  boxShadow: "0 0 0 3px rgba(255,120,2,0.35)",
                  opacity: isScrubbing ? 1 : 0,
                  transition: "opacity 0.12s",
                }}
              />
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3" dir="ltr">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              className="text-white hover:text-[#FF7802] transition-colors"
              onClick={() => skip(-SKIP)}
            >
              <IconRewind />
            </button>
            <button
              className="text-white hover:text-[#FF7802] transition-colors"
              onClick={togglePlay}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button
              className="text-white hover:text-[#FF7802] transition-colors"
              onClick={() => skip(SKIP)}
            >
              <IconForward />
            </button>
            <div className="flex items-center gap-1.5 ml-1 min-w-0">
              <span className="text-white text-xs font-mono whitespace-nowrap opacity-90">
                {formatTime(currentTime)}
              </span>
              {activeChapter && (
                <>
                  <span className="text-white/30 text-xs">·</span>
                  <span
                    className="text-white/80 text-xs font-medium truncate"
                    style={{ maxWidth: 140 }}
                  >
                    {activeChapter.title}
                  </span>
                </>
              )}
              <span className="text-white/40 text-xs font-mono whitespace-nowrap">
                / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 group/vol ml-1">
              <button
                className="text-white hover:text-[#FF7802] transition-colors flex-shrink-0"
                onClick={toggleMute}
              >
                {muted || volume === 0 ? (
                  <IconVolumeMute />
                ) : volume < 0.5 ? (
                  <IconVolumeLow />
                ) : (
                  <IconVolumeFull />
                )}
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-200 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="w-full"
                  style={{
                    accentColor: "#FF7802",
                    height: 4,
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quality */}
            <div className="relative">
              <button
                className="flex items-center gap-1 px-1.5 py-1 rounded border border-white/20 hover:border-[#FF7802]/60 transition-colors text-xs font-bold"
                style={{ color: "#ffffff" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualMenu((v) => !v);
                  setShowSpeedMenu(false);
                }}
              >
                <IconQuality />
                <span
                  className="hidden sm:inline"
                  style={{ color: "#ffffff", minWidth: 32 }}
                >
                  {currentQualLabel}
                </span>
              </button>
              {showQualMenu && (
                <div
                  className="absolute bottom-full mb-2 rounded-xl shadow-2xl z-50 overflow-hidden"
                  style={{
                    right: 0,
                    minWidth: 110,
                    background: "#1c1c1c",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p
                    className="text-xs font-bold px-4 py-2 border-b tracking-wider sticky top-0"
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      borderColor: "rgba(255,255,255,0.1)",
                      background: "#1c1c1c",
                    }}
                  >
                    QUALITY
                  </p>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color:
                        selectedIdx === -1
                          ? "#FF7802"
                          : "rgba(255,255,255,0.85)",
                      fontWeight: selectedIdx === -1 ? 700 : 400,
                      background:
                        selectedIdx === -1
                          ? "rgba(255,120,2,0.15)"
                          : "transparent",
                    }}
                    onClick={() => changeQuality(-1)}
                  >
                    Auto
                  </button>
                  {renditions.map((r) => (
                    <button
                      key={r.index}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        color:
                          selectedIdx === r.index
                            ? "#FF7802"
                            : "rgba(255,255,255,0.85)",
                        fontWeight: selectedIdx === r.index ? 700 : 400,
                        background:
                          selectedIdx === r.index
                            ? "rgba(255,120,2,0.15)"
                            : "transparent",
                      }}
                      onClick={() => changeQuality(r.index)}
                    >
                      {r.label}
                    </button>
                  ))}
                  {renditions.length === 0 && (
                    <p
                      className="px-4 py-2.5 text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Loading…
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Speed */}
            <div className="relative">
              <button
                className="px-1.5 py-1 rounded border border-white/20 hover:border-[#FF7802]/60 transition-colors text-xs font-bold"
                style={{ color: "#ffffff", minWidth: 36 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeedMenu((v) => !v);
                  setShowQualMenu(false);
                }}
              >
                {speed === 1 ? "1×" : `${speed}×`}
              </button>
              {showSpeedMenu && (
                <div
                  className="absolute bottom-full mb-2 rounded-xl shadow-2xl z-50 overflow-hidden"
                  style={{
                    right: 0,
                    minWidth: 120,
                    background: "#1c1c1c",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p
                    className="text-xs font-bold px-4 py-2 border-b tracking-wider sticky top-0"
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      borderColor: "rgba(255,255,255,0.1)",
                      background: "#1c1c1c",
                    }}
                  >
                    SPEED
                  </p>
                  {[...SPEEDS].reverse().map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{
                        color:
                          speed === s ? "#FF7802" : "rgba(255,255,255,0.85)",
                        fontWeight: speed === s ? 700 : 400,
                        background:
                          speed === s ? "rgba(255,120,2,0.15)" : "transparent",
                      }}
                      onClick={() => changeSpeed(s)}
                    >
                      {s === 1 ? "Normal (1×)" : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              className="text-white hover:text-[#FF7802] transition-colors p-1"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chapters panel shown below the player ────────────────────────────────────
function ChaptersPanel({
  chapters,
  currentTime,
  onSeek,
}: {
  chapters: VideoChapter[];
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const sorted = [...chapters].sort((a, b) => a.start_time - b.start_time);
  const active = getActiveChapter(chapters, currentTime);

  return (
    <div className="border-t border-[var(--border-color)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-3 bg-[var(--bg-card-alt)] flex items-center gap-2 transition-colors hover:bg-[var(--bg-card)] text-right"
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
          style={{
            background: "linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)",
          }}
        >
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>
        <span className="text-purple-400 text-sm">📑</span>
        <h3 className="text-theme-primary font-bold text-sm">الفصول</h3>
        <span className="text-theme-muted text-xs">({chapters.length})</span>
      </button>
      {open && (
        <div className="divide-y divide-[var(--border-color)]">
          {sorted.map((ch) => {
          const isActive = active?.id === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => onSeek(ch.start_time)}
              className={`w-full flex items-center gap-4 px-6 py-3 text-right transition-all hover:bg-[var(--bg-card-alt)] group ${isActive ? "bg-purple-900/20" : ""}`}
            >
              <span
                className={`font-mono text-xs flex-shrink-0 w-12 ${isActive ? "text-purple-400 font-bold" : "text-theme-muted"}`}
              >
                {formatTime(ch.start_time)}
              </span>
              <span
                className={`text-sm flex-1 text-right truncate transition-colors ${isActive ? "text-purple-300 font-semibold" : "text-theme-secondary group-hover:text-theme-primary"}`}
              >
                {ch.title}
              </span>
              {isActive && (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </button>
          );
        })}
        </div>
      )}
    </div>
  );
}

// ─── Main VideoPlayer wrapper ─────────────────────────────────────────────────
export function VideoPlayer({
  videoId,
  videoUrl,
  muxPlaybackId,
  videoTitle,
  courseId,
  initialPosition,
  isCompleted,
  modules,
  progressMap,
  mobileSidebar,
  chapters = [],
}: Props) {
  const router = useRouter();
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<number>(initialPosition);
  const lastDurationRef = useRef<number>(0);
  const isSavingRef = useRef(false);

  const [completed, setCompleted] = useState(isCompleted);
  const [saving, setSaving] = useState(false);
  const [justToggled, setJustToggled] = useState<"marked" | "unmarked" | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [muxToken, setMuxToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // External seek ref so ChaptersPanel can tell the player to seek
  const seekFnRef = useRef<((t: number) => void) | null>(null);

  useEffect(() => {
    if (!muxPlaybackId) {
      setTokenReady(true);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/videos/signed-url?playbackId=${encodeURIComponent(muxPlaybackId)}&videoId=${encodeURIComponent(videoId)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setMuxToken(data.unsigned ? null : (data.token ?? null));
          setTokenReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenError(true);
          setTokenReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [muxPlaybackId, videoId]);

  const completedRef = useRef(isCompleted);
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  const videoIdRef = useRef(videoId);
  const routerRef = useRef(router);
  useEffect(() => {
    videoIdRef.current = videoId;
  }, [videoId]);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const saveProgress = useCallback(
    async (position: number, done: boolean, triggerRefresh = false) => {
      if (isSavingRef.current && !done && !triggerRefresh) return;
      isSavingRef.current = true;
      setSaving(true);
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            video_id: videoIdRef.current,
            last_position: Math.floor(position),
            completed: done,
            duration:
              lastDurationRef.current > 0
                ? Math.floor(lastDurationRef.current)
                : undefined,
          }),
        });
        if (!res.ok) console.error("[progress] save error:", res.status);
      } catch (e) {
        console.error("[progress] save failed:", e);
      } finally {
        isSavingRef.current = false;
        setSaving(false);
      }
      if (triggerRefresh) routerRef.current.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const handleTimeUpdate = useCallback((t: number, dur?: number) => {
    lastPositionRef.current = t;
    setCurrentTime(t);
    if (dur && dur > 0) lastDurationRef.current = dur;
  }, []);

  useEffect(() => {
    const firstSave = setTimeout(
      () => saveProgress(lastPositionRef.current, completedRef.current),
      3000,
    );
    saveIntervalRef.current = setInterval(
      () => saveProgress(lastPositionRef.current, completedRef.current),
      5_000,
    );
    return () => {
      clearTimeout(firstSave);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      saveProgress(lastPositionRef.current, completedRef.current);
    };
  }, [saveProgress]);

  const handleEnded = useCallback(
    (finalPosition?: number) => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (!completed) {
        setCompleted(true);
        setJustToggled("marked");
        setTimeout(() => setJustToggled(null), 3000);
      }
      const pos =
        finalPosition && finalPosition > 0
          ? finalPosition
          : lastDurationRef.current > 0
            ? lastDurationRef.current
            : lastPositionRef.current;
      saveProgress(pos, true, true);
    },
    [completed, saveProgress],
  );

  const handlePause = useCallback(
    (t: number) => {
      lastPositionRef.current = t;
      saveProgress(t, completedRef.current);
    },
    [saveProgress],
  );

  const handleToggleComplete = useCallback(() => {
    const n = !completed;
    setCompleted(n);
    setJustToggled(n ? "marked" : "unmarked");
    saveProgress(lastPositionRef.current, n, true);
    setTimeout(() => setJustToggled(null), 3000);
  }, [completed, saveProgress]);

  const allVideos = modules.flatMap((m) =>
    [...(m.videos ?? [])]
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((v: any) => ({ ...v, moduleTitle: m.title })),
  );
  const nextVideo =
    allVideos[allVideos.findIndex((v: any) => v.id === videoId) + 1] ?? null;

  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const nativeSrc = !muxPlaybackId && !youtubeId ? videoUrl : null;

  const renderPlayer = () => {
    if (muxPlaybackId) {
      if (tokenError)
        return (
          <div
            className="relative bg-black w-full flex items-center justify-center"
            style={{ aspectRatio: "16/9" }}
          >
            <div className="text-center text-white">
              <p className="text-4xl mb-3">🔒</p>
              <p className="font-semibold">
                تعذر تحميل الفيديو. حاول تحديث الصفحة.
              </p>
            </div>
          </div>
        );
      if (!tokenReady)
        return (
          <div
            className="relative bg-black w-full flex items-center justify-center"
            style={{ aspectRatio: "16/9" }}
          >
            <div className="w-10 h-10 border-4 border-[#FF7802] border-t-transparent rounded-full animate-spin" />
          </div>
        );
      return (
        <MuxVideoPlayer
          playbackId={muxPlaybackId}
          token={muxToken}
          title={videoTitle}
          startTime={initialPosition}
          chapters={chapters}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={handlePause}
        />
      );
    }
    if (youtubeId)
      return (
        <YouTubePlayer
          videoId={youtubeId}
          title={videoTitle}
          startTime={initialPosition}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={handlePause}
        />
      );
    if (nativeSrc) {
      const { CustomVideoPlayer } = require("@/components/CustomVideoPlayer");
      return (
        <CustomVideoPlayer
          src={nativeSrc}
          title={videoTitle}
          startTime={initialPosition}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={handlePause}
        />
      );
    }
    return (
      <div
        className="relative bg-black w-full flex items-center justify-center"
        style={{ aspectRatio: "16/9" }}
      >
        <div className="text-center text-white">
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-semibold">الفيديو مش متاح دلوقتي.</p>
        </div>
      </div>
    );
  };

  // Chapters seek — finds the MuxVideoPlayer's internal video element and seeks it
  const handleChapterSeek = useCallback((t: number) => {
    // Walk the DOM to find the <video> element inside the player wrapper
    const playerWrapper = document.querySelector(
      ".mux-drm-container video",
    ) as HTMLVideoElement | null;
    if (playerWrapper) {
      playerWrapper.currentTime = t;
      return;
    }
    // Fallback for YouTube / native
    const anyVideo = document.querySelector("video") as HTMLVideoElement | null;
    if (anyVideo) anyVideo.currentTime = t;
  }, []);

  return (
    <div className="flex flex-col flex-1">
      {renderPlayer()}

      {/* Title + save indicator */}
      <div className="px-6 py-5 border-b border-[var(--border-color)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-theme-primary">
              {videoTitle}
            </h1>
            {saving && (
              <p className="text-xs text-theme-muted mt-1 animate-pulse">
                جاري حفظ التقدم...
              </p>
            )}
            {justToggled === "marked" && (
              <p className="text-xs text-green-400 mt-1 font-semibold animate-pulse">
                ✓ تم التسجيل كمكتمل!
              </p>
            )}
            {justToggled === "unmarked" && (
              <p className="text-xs text-yellow-400 mt-1 font-semibold animate-pulse">
                ↩ تم التسجيل كغير مكتمل
              </p>
            )}
          </div>
          <button
            onClick={handleToggleComplete}
            disabled={saving}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              completed
                ? "bg-green-500/20 hover:bg-red-500/10 border-green-500/40 hover:border-red-500/40 text-green-400 hover:text-red-400"
                : "bg-[var(--bg-card-alt)] hover:bg-green-500/20 border-[var(--border-color)] hover:border-green-500/40 text-theme-secondary hover:text-green-400"
            }`}
          >
            {completed ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="hidden sm:inline">مكتمل</span>
                <span className="sm:hidden">✓</span>
                <span className="hidden sm:inline text-xs opacity-60 font-normal">
                  · اضغط للتراجع
                </span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                سجل كمكتمل
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chapters panel — only shown for Mux videos with chapters */}
      {chapters.length > 0 && muxPlaybackId && (
        <ChaptersPanel
          chapters={chapters}
          currentTime={currentTime}
          onSeek={handleChapterSeek}
        />
      )}

      {/* Mobile sidebar */}
      {mobileSidebar && (
        <div className="lg:hidden border-b-2 border-[var(--border-color)] bg-[var(--bg-nav)]">
          <button
            onClick={() => setMobileSidebarOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 border-b-2 border-[var(--border-color)] bg-[var(--bg-nav)] transition-colors hover:bg-[var(--bg-card-alt)]"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${mobileSidebarOpen ? "rotate-0" : "-rotate-90"}`}
              style={{
                background: "linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)",
              }}
            >
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
            <h2 className="text-theme-primary font-bold text-base text-right flex-1 mr-3">
              محتوى الكورس
            </h2>
          </button>
          {mobileSidebarOpen && mobileSidebar}
        </div>
      )}

      {/* Next video */}
      {nextVideo && (
        <div className="px-6 py-4">
          <p className="text-theme-secondary text-xs font-semibold tracking-wider mb-3">
            التالي
          </p>
          <button
            onClick={() => router.push(`/dashboard/watch/${nextVideo.id}`)}
            className="flex items-center gap-4 w-full bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card)] border-2 border-[var(--border-color)] hover:border-primary rounded-xl px-5 py-4 text-right transition-all group"
          >
            <span className="mr-auto text-theme-secondary group-hover:text-primary transition-colors text-sm font-bold flex-shrink-0">
              ←
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-theme-primary font-semibold text-sm truncate">
                {nextVideo.title}
              </p>
              <p className="text-theme-secondary text-xs mt-0.5">
                {nextVideo.moduleTitle}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/20 group-hover:bg-primary rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
              <svg
                className="w-5 h-5 text-primary group-hover:text-white transition-colors"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
