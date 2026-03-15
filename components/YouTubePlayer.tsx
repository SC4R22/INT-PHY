'use client'

import { useRef, useState, useEffect, useCallback, useId } from 'react'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SKIP_SECONDS = 10

let ytApiLoaded = false
let ytApiCallbacks: (() => void)[] = []

function loadYouTubeAPI(cb: () => void) {
  if (typeof window === 'undefined') return
  if (window.YT && window.YT.Player) { cb(); return }
  ytApiCallbacks.push(cb)
  if (ytApiLoaded) return
  ytApiLoaded = true
  const prevReady = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    prevReady?.()
    ytApiCallbacks.forEach(fn => fn())
    ytApiCallbacks = []
  }
  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
}

interface Props {
  videoId: string
  title: string
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number, duration?: number) => void
  onPause?: (currentTime: number) => void
}

export function YouTubePlayer({ videoId, title, onEnded, onTimeUpdate, onPause }: Props) {
  const reactId = useId()
  const containerId = `yt-${reactId.replace(/:/g, '')}-${videoId}`

  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraggingRef = useRef(false)

  const [phase, setPhase] = useState<'loading' | 'playing' | 'paused' | 'ended'>('loading')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  // Controls auto-hide only relevant while playing
  const [showControls, setShowControls] = useState(true)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dragPct, setDragPct] = useState<number | null>(null)

  const isPlaying = phase === 'playing'
  const isPaused = phase === 'paused'
  const isEnded = phase === 'ended'
  const isLoaded = phase !== 'loading'

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false
    loadYouTubeAPI(() => {
      if (destroyed) return
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          showinfo: 0,
          autoplay: 1,  // skip thumbnail/branding splash
          mute: 1,      // required for autoplay
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            if (destroyed) return
            setDuration(e.target.getDuration())
            e.target.unMute()
            e.target.setVolume(100)
            setVolume(100)
            setMuted(false)
            e.target.playVideo()
          },
          onStateChange: (e: any) => {
            if (destroyed) return
            const S = window.YT.PlayerState
            if (e.data === S.PLAYING) {
              setPhase('playing')
              startTicker()
            } else if (e.data === S.PAUSED) {
              setPhase('paused')
              stopTicker()
              const ct = playerRef.current?.getCurrentTime?.() ?? 0
              setCurrentTime(ct)
              onPause?.(ct)
            } else if (e.data === S.ENDED) {
              setPhase('ended')
              stopTicker()
              setCurrentTime(playerRef.current?.getDuration?.() ?? 0)
              onEnded?.()
            }
          },
        },
      })
    })
    return () => {
      destroyed = true
      stopTicker()
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, containerId])

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null }
  }, [])

  const startTicker = useCallback(() => {
    stopTicker()
    tickerRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const ct = p.getCurrentTime?.() ?? 0
      const dur = p.getDuration?.() ?? 0
      setCurrentTime(ct)
      setDuration(dur)
      onTimeUpdate?.(ct, dur)
    }, 500)
  }, [onTimeUpdate, stopTicker])

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)
    return () => document.removeEventListener('fullscreenchange', onFS)
  }, [])

  // Auto-hide controls only while playing
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) {
        setShowControls(false)
      }
    }, 3000)
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p || !isLoaded || isEnded) return
    if (isPlaying) p.pauseVideo()
    else p.playVideo()
    resetHideTimer()
  }, [isPlaying, isLoaded, isEnded, resetHideTimer])

  const skip = useCallback((secs: number) => {
    const p = playerRef.current
    if (!p) return
    const ct = p.getCurrentTime?.() ?? 0
    const dur = p.getDuration?.() ?? 0
    p.seekTo(Math.max(0, Math.min(dur, ct + secs)), true)
    resetHideTimer()
  }, [resetHideTimer])

  const toggleMute = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (p.isMuted()) { p.unMute(); setMuted(false) }
    else { p.mute(); setMuted(true) }
  }, [])

  const changeVolume = useCallback((val: number) => {
    const p = playerRef.current
    if (!p) return
    p.setVolume(val)
    setVolume(val)
    if (val === 0) { p.mute(); setMuted(true) }
    else { p.unMute(); setMuted(false) }
  }, [])

  const changeSpeed = useCallback((s: number) => {
    playerRef.current?.setPlaybackRate?.(s)
    setSpeed(s)
    setShowSpeedMenu(false)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) await el.requestFullscreen()
    else await document.exitFullscreen()
  }, [])

  const getPctFromClientX = useCallback((clientX: number) => {
    const bar = progressBarRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const pct = getPctFromClientX(e.clientX)
    playerRef.current?.seekTo?.(pct * duration, true)
    setCurrentTime(pct * duration)
  }, [duration, getPctFromClientX])

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingRef.current = true
    setDragPct(getPctFromClientX(e.clientX))
    const onMove = (ev: MouseEvent) => { if (isDraggingRef.current) setDragPct(getPctFromClientX(ev.clientX)) }
    const onUp = (ev: MouseEvent) => {
      isDraggingRef.current = false
      const p = getPctFromClientX(ev.clientX)
      setDragPct(null)
      if (duration) { playerRef.current?.seekTo?.(p * duration, true); setCurrentTime(p * duration) }
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [duration, getPctFromClientX])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break
        case 'ArrowLeft': case 'j': e.preventDefault(); skip(-SKIP_SECONDS); break
        case 'ArrowRight': case 'l': e.preventDefault(); skip(SKIP_SECONDS); break
        case 'ArrowUp': e.preventDefault(); changeVolume(Math.min(100, volume + 10)); break
        case 'ArrowDown': e.preventDefault(); changeVolume(Math.max(0, volume - 10)); break
        case 'f': e.preventDefault(); toggleFullscreen(); break
        case 'm': e.preventDefault(); toggleMute(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, skip, changeVolume, toggleMute, toggleFullscreen, volume])

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayPct = dragPct !== null ? dragPct * 100 : progressPct

  // Controls bar: always shown when paused/ended, auto-hides when playing
  const showBottomBar = isPaused || isEnded || showControls

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full select-none overflow-hidden"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={() => { if (showSpeedMenu) setShowSpeedMenu(false) }}
    >
      {/* YouTube iframe — pointer-events:none, our overlays own all interaction */}
      <div
        id={containerId}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── LOADING COVER ─────────────────────────────────────────────────────
          Solid black until autoplay fires — hides YouTube's thumbnail & logo  */}
      {phase === 'loading' && (
        <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── PAUSE / END BLACK COVER ───────────────────────────────────────────
          Sits above the iframe (z-20) whenever paused or ended.
          This is what hides YouTube's "More videos" panel — it renders inside
          the iframe so the only way to cover it is with a div on top of it.   */}
      {(isPaused || isEnded) && (
        <div className="absolute inset-0 z-20 bg-black" />
      )}

      {/* ── CLICK CAPTURE ─────────────────────────────────────────────────────
          Transparent div that sits above everything except our controls.
          Only active when loaded — prevents stray clicks reaching the iframe. */}
      {isLoaded && (
        <div
          className="absolute inset-0 z-30"
          style={{ cursor: showControls ? 'default' : 'none' }}
          onClick={!isEnded ? togglePlay : undefined}
          onDoubleClick={toggleFullscreen}
        />
      )}

      {/* ── GRADIENT ──────────────────────────────────────────────────────────
          Shown when playing and controls are visible, or always when paused   */}
      <div
        className="absolute inset-0 z-40 pointer-events-none transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 30%, transparent 55%)',
          opacity: isPaused || showControls ? 1 : 0,
        }}
      />

      {/* ── CENTER CONTROLS ───────────────────────────────────────────────────
          Shown when playing+controls-visible OR when paused (always)          */}
      {!isEnded && (isPaused || showControls) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center gap-12 pointer-events-none">
          <button suppressHydrationWarning
            className="pointer-events-auto flex items-center gap-1 text-white/80 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); skip(-SKIP_SECONDS) }}
          >
            <div className="relative">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black mt-1">10</span>
            </div>
          </button>

          <button suppressHydrationWarning
            className="pointer-events-auto w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110 border border-white/20"
            onClick={(e) => { e.stopPropagation(); togglePlay() }}
          >
            {isPlaying
              ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>

          <button suppressHydrationWarning
            className="pointer-events-auto flex items-center gap-1 text-white/80 hover:text-white transition-colors"
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
      )}

      {/* ── END SCREEN ────────────────────────────────────────────────────────
          Shown above the black cover (z-50) when the video ends               */}
      {isEnded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <p className="text-white/50 text-sm">انتهى الفيديو</p>
          <button
            suppressHydrationWarning
            className="pointer-events-auto px-6 py-3 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}
            onClick={() => { playerRef.current?.seekTo?.(0, true); playerRef.current?.playVideo?.() }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            إعادة التشغيل
          </button>
        </div>
      )}

      {/* ── BOTTOM CONTROLS BAR ───────────────────────────────────────────────
          Always visible when paused or ended; auto-hides 3s after last move   */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-3 pt-8 transition-opacity duration-300"
        style={{
          opacity: showBottomBar ? 1 : 0,
          pointerEvents: showBottomBar ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressBarRef}
          className="relative w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer group/progress"
          onClick={seekTo}
          onMouseDown={handleProgressMouseDown}
        >
          <div
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all group-hover/progress:h-1.5 group-hover/progress:-translate-y-px"
            style={{ width: `${displayPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100"
            style={{ left: `calc(${displayPct}% - 7px)` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3" dir="ltr">
          {/* LEFT: Fullscreen · Speed */}
          <div className="flex items-center gap-3">
            <button suppressHydrationWarning className="text-white hover:text-primary transition-colors" onClick={toggleFullscreen}>
              {isFullscreen
                ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              }
            </button>

            <div className="relative">
              <button suppressHydrationWarning
                className="text-white hover:text-primary transition-colors text-xs font-bold px-2 py-1 rounded border border-white/30 hover:border-primary min-w-[40px] text-center"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(v => !v) }}
              >
                {speed === 1 ? '1x' : `${speed}x`}
              </button>
              {showSpeedMenu && (
                <div
                  className="absolute mb-2 rounded-xl shadow-2xl z-[60] min-w-[110px] overflow-y-auto"
                  style={{ bottom: '100%', left: 0, maxHeight: '55dvh', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-white/40 text-[10px] font-bold px-4 py-2 border-b uppercase tracking-wider sticky top-0" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#1c1c1c' }}>SPEED</p>
                  {[...SPEEDS].reverse().map((s) => (
                    <button suppressHydrationWarning key={s} onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${speed === s ? 'text-primary font-bold' : 'text-white/80'}`}
                      style={speed === s ? { background: 'rgba(255,120,2,0.15)' } : undefined}
                    >
                      {s === 1 ? 'Normal (1x)' : `${s}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Time · Volume · Skip · Play · Skip */}
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex items-center gap-2 group/vol">
              <div className="hidden group-hover/vol:flex items-center w-20">
                <input type="range" min={0} max={100} step={5}
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  className="w-full h-1 accent-primary cursor-pointer"
                />
              </div>
              <button suppressHydrationWarning className="text-white hover:text-primary transition-colors" onClick={toggleMute}>
                {muted || volume === 0
                  ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  : volume < 50
                  ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                  : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                }
              </button>
            </div>

            <button suppressHydrationWarning className="text-white hover:text-primary transition-colors flex items-center gap-0.5" onClick={() => skip(-SKIP_SECONDS)}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
              <span className="text-[10px] font-bold leading-none">10</span>
            </button>

            <button suppressHydrationWarning className="text-white hover:text-primary transition-colors" onClick={togglePlay}>
              {isPlaying
                ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>

            <button suppressHydrationWarning className="text-white hover:text-primary transition-colors flex items-center gap-0.5" onClick={() => skip(SKIP_SECONDS)}>
              <span className="text-[10px] font-bold leading-none">10</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
