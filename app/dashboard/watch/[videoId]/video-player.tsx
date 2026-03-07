'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer'

interface Props {
  videoId: string
  videoUrl: string | null
  muxPlaybackId: string | null
  videoTitle: string
  courseId: string
  initialPosition: number
  isCompleted: boolean
  modules: any[]
  progressMap: Record<string, { video_id: string; completed: boolean; last_position: number }>
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1].split('?')[0]
  } catch { /* not a valid URL */ }
  return null
}

function buildYouTubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1`
}

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
}: Props) {
  const router = useRouter()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoCompletedRef = useRef(false) // prevent firing auto-complete multiple times
  const userIdRef = useRef<string | null>(null) // cache user id — avoid repeated getUser() calls
  const [completed, setCompleted] = useState(isCompleted)
  const [saving, setSaving] = useState(false)
  const [justToggled, setJustToggled] = useState<'marked' | 'unmarked' | null>(null)

  // Fetch user id once on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
  }, [])

  // ── Signed Mux token ──────────────────────────────────────────────────────
  const [muxToken, setMuxToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState(false)

  useEffect(() => {
    if (!muxPlaybackId) return
    let cancelled = false
    const fetchToken = async () => {
      try {
        const res = await fetch(
          `/api/videos/signed-url?playbackId=${encodeURIComponent(muxPlaybackId)}&videoId=${encodeURIComponent(videoId)}`
        )
        if (!res.ok) throw new Error('Failed to fetch token')
        const data = await res.json()
        if (cancelled) return
        setMuxToken(data.token ?? '__unsigned__')
      } catch {
        if (!cancelled) setTokenError(true)
      }
    }
    fetchToken()
    return () => { cancelled = true }
  }, [muxPlaybackId, videoId])

  // ── Progress saving ───────────────────────────────────────────────────────
  const saveProgress = useCallback(async (position: number, done: boolean) => {
    const userId = userIdRef.current
    if (!userId) return
    setSaving(true)
    const supabase = createClient()

    await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        video_id: videoId,
        last_position: Math.floor(position),
        completed: done,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,video_id' }
    )
    setSaving(false)
    router.refresh()
  }, [videoId, router])

  // ── Auto-complete on ended only (or manual toggle) ──────────────────────
  const handleTimeUpdate = useCallback((currentTime: number, duration?: number) => {
    // Periodic save every 10s (no auto-complete on time update anymore)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveProgress(currentTime, completed), 10_000)
  }, [completed, saveProgress])

  const handleEnded = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (!completed) {
      autoCompletedRef.current = true
      setCompleted(true)
      setJustToggled('marked')
      setTimeout(() => setJustToggled(null), 3000)
    }
    saveProgress(0, true)
  }, [completed, saveProgress])

  const handlePause = useCallback((currentTime: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveProgress(currentTime, completed)
  }, [completed, saveProgress])

  // ── Toggle complete / uncomplete ──────────────────────────────────────────
  const handleToggleComplete = useCallback(() => {
    const newState = !completed
    setCompleted(newState)
    autoCompletedRef.current = newState // if manually unmarked, allow auto-complete again on next watch
    setJustToggled(newState ? 'marked' : 'unmarked')
    saveProgress(0, newState)
    setTimeout(() => setJustToggled(null), 3000)
  }, [completed, saveProgress])

  // ── Next video ────────────────────────────────────────────────────────────
  const allVideos = modules.flatMap((m) =>
    [...(m.videos ?? [])]
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((v: any) => ({ ...v, moduleTitle: m.title }))
  )
  const currentIdx = allVideos.findIndex((v: any) => v.id === videoId)
  const nextVideo = currentIdx >= 0 ? allVideos[currentIdx + 1] : null

  // ── Determine source ──────────────────────────────────────────────────────
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null
  const muxSrc = muxPlaybackId && muxToken
    ? muxToken === '__unsigned__'
      ? `https://stream.mux.com/${muxPlaybackId}.m3u8`
      : `https://stream.mux.com/${muxPlaybackId}.m3u8?token=${muxToken}`
    : null
  const nativeSrc = !muxPlaybackId && !youtubeId ? videoUrl : null
  const videoSrc = muxSrc ?? nativeSrc

  return (
    <div className="flex flex-col flex-1">
      {/* ── Player ── */}
      {muxPlaybackId ? (
        tokenError ? (
          <div className="relative bg-black w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
            <div className="text-center text-theme-secondary">
              <p className="text-4xl mb-3">🔒</p>
              <p className="font-semibold">تعذر تحميل الفيديو. حاول تحديث الصفحة.</p>
            </div>
          </div>
        ) : !muxToken ? (
          <div className="relative bg-black w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <CustomVideoPlayer
            src={muxSrc!}
            title={videoTitle}
            startTime={initialPosition}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPause={handlePause}
          />
        )
      ) : videoSrc ? (
        <CustomVideoPlayer
          src={videoSrc}
          title={videoTitle}
          startTime={initialPosition}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={handlePause}
        />
      ) : youtubeId ? (
        <div className="relative bg-black w-full" style={{ aspectRatio: '16/9' }}>
          <iframe
            key={youtubeId}
            src={buildYouTubeEmbedUrl(youtubeId)}
            title={videoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="relative bg-black w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
          <div className="text-center text-theme-secondary">
            <p className="text-4xl mb-3">🎬</p>
            <p className="font-semibold">الفيديو مش متاح دلوقتي.</p>
          </div>
        </div>
      )}

      {/* ── Info bar ── */}
      <div className="px-6 py-5 border-b border-[var(--border-color)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-theme-primary">{videoTitle}</h1>
            {saving && <p className="text-xs text-theme-muted mt-1 animate-pulse">جاري حفظ التقدم...</p>}
            {justToggled === 'marked' && (
              <p className="text-xs text-green-400 mt-1 font-semibold animate-pulse">✓ تم التسجيل كمكتمل!</p>
            )}
            {justToggled === 'unmarked' && (
              <p className="text-xs text-yellow-400 mt-1 font-semibold animate-pulse">↩ تم التسجيل كغير مكتمل</p>
            )}
          </div>

          {/* Toggle button — always visible, switches between complete/uncomplete */}
          <button
            onClick={handleToggleComplete}
            disabled={saving}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              completed
                ? 'bg-green-500/20 hover:bg-red-500/10 border-green-500/40 hover:border-red-500/40 text-green-400 hover:text-red-400'
                : 'bg-[var(--bg-card-alt)] hover:bg-green-500/20 border-[var(--border-color)] hover:border-green-500/40 text-theme-secondary hover:text-green-400'
            }`}
          >
            {completed ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">مكتمل</span>
                <span className="sm:hidden">✓</span>
                <span className="hidden sm:inline text-xs opacity-60 font-normal">· اضغط للتراجع</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                </svg>
                سجل كمكتمل
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Up Next ── */}
      {nextVideo && (
        <div className="px-6 py-4">
          <p className="text-theme-secondary text-xs font-semibold tracking-wider mb-3">التالي</p>
          <button
            onClick={() => router.push(`/dashboard/watch/${nextVideo.id}`)}
            className="flex items-center gap-4 w-full bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card)] border-2 border-[var(--border-color)] hover:border-primary rounded-xl px-5 py-4 text-right transition-all group"
          >
            <span className="mr-auto text-theme-secondary group-hover:text-primary transition-colors text-sm font-bold flex-shrink-0">←</span>
            <div className="min-w-0 flex-1">
              <p className="text-theme-primary font-semibold text-sm truncate">{nextVideo.title}</p>
              <p className="text-theme-secondary text-xs mt-0.5">{nextVideo.moduleTitle}</p>
            </div>
            <div className="w-10 h-10 bg-primary/20 group-hover:bg-primary rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-primary group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
