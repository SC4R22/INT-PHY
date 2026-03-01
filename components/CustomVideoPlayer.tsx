'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4]
const SKIP_SECONDS = 10

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

interface Props {
  src: string          // HLS (.m3u8) or direct mp4 URL
  title: string
  startTime?: number
  onTimeUpdate?: (currentTime: number, duration?: number) => void
  onEnded?: () => void
  onPause?: (currentTime: number) => void
}

export function CustomVideoPlayer({ src, title, startTime = 0, onTimeUpdate, onEnded, onPause }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hlsRef = useRef<any>(null)
  // Stable refs for keyboard handler — avoids re-registering on every render
  const togglePlayRef = useRef<() => void>(() => {})
  const skipRef = useRef<(s: number) => void>(() => {})
  const toggleMuteRef = useRef<() => void>(() => {})
  const toggleFullscreenRef = useRef<() => void>(() => {})

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(startTime)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [dragPct, setDragPct] = useState<number | null>(null) // live pct while dragging
  const isDraggingRef = useRef(false)

  // ── Load HLS or native ────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const isHLS = src.includes('.m3u8')

    if (isHLS) {
      // Dynamically import hls.js to avoid SSR issues
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          // Safari supports HLS natively
          video.src = src
          return
        }

        const hls = new Hls({ startPosition: startTime })
        hlsRef.current = hls
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.currentTime = startTime
        })
      })
    } else {
      video.src = src
      video.currentTime = startTime
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [src, startTime])

  // ── Fullscreen listener ───────────────────────────────────────────────────
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  // Keep controls visible when paused
  useEffect(() => {
    if (!playing) {
      setShowControls(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [playing])

  // ── Player actions ────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { video.play(); setPlaying(true) }
    else { video.pause(); setPlaying(false) }
    resetHideTimer()
  }, [resetHideTimer])

  const skip = useCallback((secs: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + secs))
    resetHideTimer()
  }, [resetHideTimer])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }, [])

  const changeVolume = useCallback((val: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = val
    video.muted = val === 0
    setVolume(val)
    setMuted(val === 0)
  }, [])

  const changeSpeed = useCallback((s: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = s
    setSpeed(s)
    setShowSpeedMenu(false)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }, [])

  // Keep refs up to date so the keyboard handler always calls the latest version
  useEffect(() => { togglePlayRef.current = togglePlay }, [togglePlay])
  useEffect(() => { skipRef.current = skip }, [skip])
  useEffect(() => { toggleMuteRef.current = toggleMute }, [toggleMute])
  useEffect(() => { toggleFullscreenRef.current = toggleFullscreen }, [toggleFullscreen])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlayRef.current()
          break
        case 'ArrowLeft':
        case 'j':
          e.preventDefault()
          skipRef.current(-SKIP_SECONDS)
          break
        case 'ArrowRight':
        case 'l':
          e.preventDefault()
          skipRef.current(SKIP_SECONDS)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(v => { const nv = Math.min(1, v + 0.1); video.volume = nv; return nv })
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(v => { const nv = Math.max(0, v - 0.1); video.volume = nv; return nv })
          break
        case 'f':
          e.preventDefault()
          toggleFullscreenRef.current()
          break
        case 'm':
          e.preventDefault()
          toggleMuteRef.current()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // stable — reads from refs, never needs to re-register

  // ── Progress bar scrubbing (click + drag + touch) ────────────────────────
  const getPctFromClientX = useCallback((clientX: number) => {
    const bar = progressRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const pct = getPctFromClientX(e.clientX)
    video.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }, [duration, getPctFromClientX])

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingRef.current = true
    setSeeking(true)
    const pct = getPctFromClientX(e.clientX)
    setDragPct(pct)

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      const p = getPctFromClientX(ev.clientX)
      setDragPct(p)
    }

    const onMouseUp = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setSeeking(false)
      const p = getPctFromClientX(ev.clientX)
      setDragPct(null)
      const video = videoRef.current
      if (video && duration) {
        video.currentTime = p * duration
        setCurrentTime(p * duration)
      }
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [duration, getPctFromClientX])

  const handleProgressTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingRef.current = true
    setSeeking(true)
    const touch = e.touches[0]
    const pct = getPctFromClientX(touch.clientX)
    setDragPct(pct)

    const onTouchMove = (ev: TouchEvent) => {
      if (!isDraggingRef.current) return
      const p = getPctFromClientX(ev.touches[0].clientX)
      setDragPct(p)
    }

    const onTouchEnd = (ev: TouchEvent) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setSeeking(false)
      const p = getPctFromClientX(ev.changedTouches[0].clientX)
      setDragPct(null)
      const video = videoRef.current
      if (video && duration) {
        video.currentTime = p * duration
        setCurrentTime(p * duration)
      }
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }, [duration, getPctFromClientX])

  // ── Video event handlers ──────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    onTimeUpdate?.(video.currentTime, video.duration || undefined)

    // Update buffered
    if (video.buffered.length > 0) {
      setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100)
    }
  }, [onTimeUpdate])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    setShowControls(true)
    onEnded?.()
  }, [onEnded])

  const handleVideoPause = useCallback(() => {
    setPlaying(false)
    onPause?.(videoRef.current?.currentTime ?? 0)
  }, [onPause])

  const handleVideoPlay = useCallback(() => setPlaying(true), [])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
  }, [])

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  // While dragging show the drag position, otherwise show real playback position
  const displayPct = dragPct !== null ? dragPct * 100 : progressPct

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={() => {
        // Close menus on background click
        if (showSpeedMenu) setShowSpeedMenu(false)
        if (showVolumeSlider) setShowVolumeSlider(false)
      }}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={handleVideoPause}
        onPlay={handleVideoPlay}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={(e) => { e.stopPropagation(); togglePlay() }}
        onDoubleClick={toggleFullscreen}
        playsInline
      />

      {/* ── Center click feedback (play/pause icon flash) ── */}
      {/* ── Gradient overlay at bottom ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 25%, transparent 50%)',
          opacity: showControls ? 1 : 0,
        }}
      />

      {/* ── Center play/pause + skip buttons (shown on hover) ── */}
      <div
        className="absolute inset-0 flex items-center justify-center gap-12 transition-opacity duration-200 pointer-events-none"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {/* Skip back */}
        <button
          className="pointer-events-auto flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors group"
          onClick={(e) => { e.stopPropagation(); skip(-SKIP_SECONDS) }}
        >
          <div className="relative">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black mt-1">10</span>
          </div>
        </button>

        {/* Play / Pause */}
        <button
          className="pointer-events-auto w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110 border border-white/20"
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
        >
          {playing ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Skip forward */}
        <button
          className="pointer-events-auto flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); skip(SKIP_SECONDS) }}
        >
          <div className="relative">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black mt-1">10</span>
          </div>
        </button>
      </div>

      {/* ── Bottom controls bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer group/progress"
          onClick={seekTo}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
        >
          {/* Buffered */}
          <div
            className="absolute left-0 top-0 h-full bg-white/40 rounded-full"
            style={{ width: `${buffered}%` }}
          />
          {/* Played */}
          <div
            className={`absolute left-0 top-0 h-full bg-[#6A0DAD] rounded-full ${
              seeking ? '' : 'transition-all'
            } group-hover/progress:h-1.5 group-hover/progress:-translate-y-px`}
            style={{ width: `${displayPct}%` }}
          />
          {/* Scrubber thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#6A0DAD] rounded-full shadow-lg transition-opacity ${
              seeking ? 'opacity-100 scale-125' : 'opacity-0 group-hover/progress:opacity-100'
            }`}
            style={{ left: `calc(${displayPct}% - 7px)` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-3">
          {/* LEFT controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              className="text-white hover:text-[#A855F7] transition-colors"
              onClick={togglePlay}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              {playing ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip back */}
            <button
              className="text-white hover:text-[#A855F7] transition-colors flex items-center gap-0.5"
              onClick={() => skip(-SKIP_SECONDS)}
              title="Rewind 10s (←)"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              <span className="text-[10px] font-bold leading-none">10</span>
            </button>

            {/* Skip forward */}
            <button
              className="text-white hover:text-[#A855F7] transition-colors flex items-center gap-0.5"
              onClick={() => skip(SKIP_SECONDS)}
              title="Forward 10s (→)"
            >
              <span className="text-[10px] font-bold leading-none">10</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
              </svg>
            </button>

            {/* Volume */}
            <div className="relative flex items-center group/vol">
              <button
                className="text-white hover:text-[#A855F7] transition-colors"
                onClick={toggleMute}
                title="Mute (M)"
              >
                {muted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>
              {/* Volume slider — appears on hover */}
              <div className="hidden group-hover/vol:flex items-center ml-2 w-20">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  className="w-full h-1 accent-[#6A0DAD] cursor-pointer"
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-white text-xs font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* RIGHT controls */}
          <div className="flex items-center gap-3">
            {/* Speed */}
            <div className="relative">
              <button
                className="text-white hover:text-[#A855F7] transition-colors text-xs font-bold px-2 py-1 rounded border border-white/30 hover:border-[#A855F7] min-w-[48px] text-center"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(v => !v); setShowVolumeSlider(false) }}
                title="Playback speed"
              >
                {speed === 1 ? '1x' : `${speed}x`}
              </button>

              {showSpeedMenu && (
                <div
                  className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-[#3A3A3A] rounded-xl overflow-hidden shadow-2xl z-50 min-w-[100px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    <p className="text-[#B3B3B3] text-xs font-bold px-4 py-2 border-b border-[#3A3A3A] uppercase tracking-wider">
                      Speed
                    </p>
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          speed === s
                            ? 'text-[#A855F7] bg-[#6A0DAD]/20 font-bold'
                            : 'text-white hover:bg-[#2A2A2A]'
                        }`}
                      >
                        {s === 1 ? 'Normal (1x)' : `${s}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              className="text-white hover:text-[#A855F7] transition-colors"
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
