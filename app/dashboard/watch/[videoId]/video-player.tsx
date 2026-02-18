'use client'

import { useRef, useState, useCallback } from 'react'
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
  const [completed, setCompleted] = useState(isCompleted)
  const [saving, setSaving] = useState(false)

  // ── Progress saving ───────────────────────────────────────────────────────
  const saveProgress = useCallback(async (position: number, done: boolean) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('user_progress').upsert(
      {
        user_id: user.id,
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

  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveProgress(currentTime, completed), 10_000)
  }, [completed, saveProgress])

  const handleEnded = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveProgress(0, true)
    setCompleted(true)
  }, [saveProgress])

  const handlePause = useCallback((currentTime: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveProgress(currentTime, completed)
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
  // Mux HLS URL — the custom player uses hls.js to load this
  const muxSrc = muxPlaybackId ? `https://stream.mux.com/${muxPlaybackId}.m3u8` : null
  // Native direct URL (mp4 etc.) — used when no Mux ID and not YouTube
  const nativeSrc = !muxPlaybackId && !youtubeId ? videoUrl : null

  const videoSrc = muxSrc ?? nativeSrc

  return (
    <div className="flex flex-col flex-1">
      {/* ── Player ── */}
      {videoSrc ? (
        // Custom Udemy-style player for Mux + native videos
        <CustomVideoPlayer
          src={videoSrc}
          title={videoTitle}
          startTime={initialPosition}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={handlePause}
        />
      ) : youtubeId ? (
        // YouTube — embedded iframe (controls are YouTube's own)
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
        // No video at all
        <div className="relative bg-black w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
          <div className="text-center text-[#B3B3B3]">
            <p className="text-4xl mb-3">🎬</p>
            <p className="font-semibold">Video not available yet.</p>
          </div>
        </div>
      )}

      {/* ── Info bar ── */}
      <div className="px-6 py-5 border-b border-[#3A3A3A]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#EFEFEF]">{videoTitle}</h1>
            {saving && <p className="text-xs text-[#B3B3B3] mt-1 animate-pulse">Saving progress...</p>}
            {completed && (
              <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/40">
                ✓ Completed
              </span>
            )}
          </div>

          {!completed && (
            <button
              onClick={() => { saveProgress(0, true); setCompleted(true) }}
              className="flex-shrink-0 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 text-sm font-bold rounded-lg transition-colors"
            >
              ✓ Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* ── Up Next ── */}
      {nextVideo && (
        <div className="px-6 py-4">
          <p className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-3">Up Next</p>
          <button
            onClick={() => router.push(`/dashboard/watch/${nextVideo.id}`)}
            className="flex items-center gap-4 w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] border-2 border-[#3A3A3A] hover:border-primary rounded-xl px-5 py-4 text-left transition-all group"
          >
            <div className="w-10 h-10 bg-primary/20 group-hover:bg-primary rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-primary group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[#EFEFEF] font-semibold text-sm truncate">{nextVideo.title}</p>
              <p className="text-[#B3B3B3] text-xs mt-0.5">{nextVideo.moduleTitle}</p>
            </div>
            <span className="ml-auto text-[#B3B3B3] group-hover:text-primary transition-colors text-sm font-bold flex-shrink-0">→</span>
          </button>
        </div>
      )}
    </div>
  )
}
