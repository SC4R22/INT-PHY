'use client'

import { use, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MuxVideoUploader } from '@/components/MuxVideoUploader'

interface Video {
  id: string
  title: string
  video_url: string | null
  mux_playback_id: string | null
  duration: number | null
}

interface Module {
  id: string
  title: string
  videos: Video[]
}

export default function CourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params)
  const router = useRouter()

  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [videoForm, setVideoForm] = useState({ title: '', video_url: '', duration: '' })
  const [addingVideo, setAddingVideo] = useState(false)

  // Mux upload state
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url')
  const [muxResult, setMuxResult] = useState<{ assetId: string; playbackId: string; duration: number | null } | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: courseData, error: courseErr } = await supabase
      .from('courses').select('*').eq('id', courseId).single()
    if (courseErr) { setError(courseErr.message); setLoading(false); return }
    setCourse(courseData)

    const { data: modulesData, error: modulesErr } = await supabase
      .from('modules')
      .select('*, videos(*)')
      .eq('course_id', courseId)
      .order('order_index')

    if (modulesErr) { setError(modulesErr.message); setLoading(false); return }

    if (modulesData) {
      const sorted = modulesData.map((mod: any) => ({
        ...mod,
        videos: [...(mod.videos ?? [])].sort(
          (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
        ),
      }))
      setModules(sorted)
    }
    setLoading(false)
  }, [courseId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const resetVideoForm = () => {
    setVideoForm({ title: '', video_url: '', duration: '' })
    setMuxResult(null)
    setUploadMode('url')
    setActiveModuleId(null)
  }

  const addModule = async () => {
    if (!newModuleTitle.trim()) return
    setAddingModule(true)
    setError(null)
    const { error: err } = await supabase.from('modules').insert({
      course_id: courseId,
      title: newModuleTitle.trim(),
      order_index: modules.length + 1,
    })
    if (err) { setError(err.message); setAddingModule(false); return }
    setNewModuleTitle('')
    setAddingModule(false)
    fetchData()
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its videos?')) return
    await supabase.from('modules').delete().eq('id', moduleId)
    fetchData()
  }

  const addVideo = async (moduleId: string) => {
    if (!videoForm.title.trim()) return
    if (uploadMode === 'url' && !videoForm.video_url.trim()) return
    if (uploadMode === 'upload' && !muxResult) return

    setAddingVideo(true)
    setError(null)

    const insertPayload: any = {
      module_id: moduleId,
      title: videoForm.title.trim(),
      order_index: (modules.find(m => m.id === moduleId)?.videos.length || 0) + 1,
    }

    if (uploadMode === 'url') {
      insertPayload.video_url = videoForm.video_url.trim()
      insertPayload.duration = videoForm.duration ? parseInt(videoForm.duration) : null
    } else if (muxResult) {
      insertPayload.mux_asset_id = muxResult.assetId
      insertPayload.mux_playback_id = muxResult.playbackId
      insertPayload.duration = muxResult.duration
    }

    const { error: err } = await supabase.from('videos').insert(insertPayload)
    if (err) { setError(err.message); setAddingVideo(false); return }

    resetVideoForm()
    setAddingVideo(false)
    fetchData()
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video?')) return
    await supabase.from('videos').delete().eq('id', videoId)
    fetchData()
  }

  // Determine if the add button should be enabled
  const canAddVideo = (moduleId: string) => {
    if (!videoForm.title.trim()) return false
    if (uploadMode === 'url') return videoForm.video_url.trim().length > 0
    return muxResult !== null
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-[#B3B3B3] text-xl animate-pulse">Loading course content...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => router.push('/admin/courses')} className="text-[#B3B3B3] hover:text-[#EFEFEF] flex items-center gap-2 mb-4 transition-colors">
          ← Back to Courses
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-1">
              {course?.title}
            </h1>
            <p className="text-[#B3B3B3]">Manage modules and videos</p>
          </div>
          <div className="flex gap-3 items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${course?.published ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
              {course?.published ? 'PUBLISHED' : 'DRAFT'}
            </span>
            <button
              onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
              className="px-4 py-2 bg-[#3A3A3A] text-[#EFEFEF] rounded-lg font-semibold hover:bg-[#4A4A4A] transition-all text-sm"
            >
              Edit Details
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-[#6A0DAD]">
          <p className="text-[#B3B3B3] text-sm">Modules</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{modules.length}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-[#B3B3B3] text-sm">Total Videos</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{modules.reduce((acc, m) => acc + m.videos.length, 0)}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-green-500">
          <p className="text-[#B3B3B3] text-sm">Price</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{course?.is_free ? 'Free' : `${course?.price_cash} EGP`}</p>
        </div>
      </div>

      {/* Modules list */}
      <div className="space-y-4 mb-6">
        {modules.length === 0 && (
          <div className="text-center py-12 text-[#B3B3B3]">
            No modules yet — add one below to get started
          </div>
        )}

        {modules.map((mod, modIndex) => (
          <div key={mod.id} className="bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-[#3A3A3A]">
            {/* Module header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#3A3A3A]">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-[#6A0DAD] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {modIndex + 1}
                </span>
                <h3 className="text-[#EFEFEF] font-bold text-lg">{mod.title}</h3>
                <span className="text-[#B3B3B3] text-sm">({mod.videos.length} video{mod.videos.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (activeModuleId === mod.id) { resetVideoForm() } else {
                      resetVideoForm()
                      setActiveModuleId(mod.id)
                    }
                  }}
                  className="px-3 py-1 bg-[#6A0DAD] text-white text-sm font-semibold rounded hover:bg-[#8B2CAD] transition-colors"
                >
                  {activeModuleId === mod.id ? '✕ Cancel' : '+ Add Video'}
                </button>
                <button
                  onClick={() => deleteModule(mod.id)}
                  className="px-3 py-1 bg-red-600/30 text-red-400 text-sm font-semibold rounded hover:bg-red-600/50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Videos list */}
            <div className="divide-y divide-[#3A3A3A]">
              {mod.videos.length === 0 && activeModuleId !== mod.id && (
                <p className="px-6 py-4 text-[#B3B3B3] text-sm italic">
                  No videos yet — click &quot;+ Add Video&quot; to get started
                </p>
              )}
              {mod.videos.map((video, vidIndex) => (
                <div key={video.id} className="flex items-center justify-between px-6 py-3 hover:bg-[#3A3A3A]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-[#6A0DAD] font-bold text-sm w-6">{vidIndex + 1}.</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[#EFEFEF] font-semibold">{video.title}</p>
                        {/* Badge: show where the video is hosted */}
                        {video.mux_playback_id ? (
                          <span className="px-2 py-0.5 bg-[#6A0DAD]/30 text-[#B3B3B3] text-xs font-bold rounded-full border border-[#6A0DAD]/40">
                            MUX
                          </span>
                        ) : video.video_url?.includes('youtube') ? (
                          <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-bold rounded-full border border-red-700/40">
                            YT
                          </span>
                        ) : video.video_url ? (
                          <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-full border border-blue-700/40">
                            URL
                          </span>
                        ) : null}
                      </div>
                      {video.video_url && (
                        <p className="text-[#555] text-xs truncate max-w-md">{video.video_url}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {video.duration && (
                      <span className="text-[#B3B3B3] text-sm">
                        {Math.floor(video.duration / 60)}m {video.duration % 60}s
                      </span>
                    )}
                    <button
                      onClick={() => deleteVideo(video.id)}
                      className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add video inline form */}
            {activeModuleId === mod.id && (
              <div className="px-6 py-5 bg-[#1a1a1a] border-t-2 border-[#6A0DAD]">
                <p className="text-[#B3B3B3] text-sm font-bold uppercase tracking-wider mb-4">Add New Video</p>

                <div className="space-y-4">
                  {/* Title */}
                  <input
                    type="text"
                    placeholder="Video title *"
                    value={videoForm.title}
                    onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600"
                  />

                  {/* Mode toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setUploadMode('url'); setMuxResult(null) }}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${
                        uploadMode === 'url'
                          ? 'bg-[#6A0DAD] text-white border-[#6A0DAD]'
                          : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-[#6A0DAD]'
                      }`}
                    >
                      🔗 YouTube / URL
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUploadMode('upload'); setVideoForm(p => ({ ...p, video_url: '' })) }}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${
                        uploadMode === 'upload'
                          ? 'bg-[#6A0DAD] text-white border-[#6A0DAD]'
                          : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-[#6A0DAD]'
                      }`}
                    >
                      ☁️ Upload to Mux
                    </button>
                  </div>

                  {/* URL mode */}
                  {uploadMode === 'url' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="YouTube URL or direct video URL *"
                        value={videoForm.video_url}
                        onChange={e => setVideoForm(p => ({ ...p, video_url: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600"
                      />
                      <input
                        type="number"
                        placeholder="Duration in seconds (optional — e.g. 300 = 5 min)"
                        value={videoForm.duration}
                        onChange={e => setVideoForm(p => ({ ...p, duration: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600"
                      />
                    </div>
                  )}

                  {/* Upload mode — Mux direct upload */}
                  {uploadMode === 'upload' && (
                    <MuxVideoUploader
                      onSuccess={(result) => setMuxResult(result)}
                      onError={(err) => setError(err)}
                    />
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => addVideo(mod.id)}
                      disabled={addingVideo || !canAddVideo(mod.id)}
                      className="px-5 py-2 bg-[#6A0DAD] text-white text-sm font-bold rounded-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addingVideo ? 'Saving...' : 'Save Video'}
                    </button>
                    <button
                      onClick={resetVideoForm}
                      className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A] transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add module */}
      <div className="bg-[#2A2A2A] rounded-xl p-6 border-2 border-dashed border-[#3A3A3A] hover:border-[#6A0DAD] transition-colors">
        <p className="text-[#B3B3B3] text-sm font-bold uppercase tracking-wider mb-3">Add New Module</p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Module title, e.g. Chapter 1: Introduction to Mechanics"
            value={newModuleTitle}
            onChange={e => setNewModuleTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addModule()}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors placeholder:text-gray-600"
          />
          <button
            onClick={addModule}
            disabled={addingModule || !newModuleTitle.trim()}
            className="px-6 py-3 bg-[#6A0DAD] text-white font-bold rounded-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-50"
          >
            {addingModule ? 'Adding...' : '+ Add Module'}
          </button>
        </div>
      </div>
    </div>
  )
}
