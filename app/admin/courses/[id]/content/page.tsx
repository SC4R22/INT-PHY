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

interface ModuleFile {
  id: string
  name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  order_index: number
}

interface Module {
  id: string
  title: string
  videos: Video[]
  files: ModuleFile[]
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string | null): string {
  if (!type) return '📄'
  if (type.includes('pdf')) return '📕'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('image')) return '🖼️'
  return '📄'
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

  // Video form state
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [videoForm, setVideoForm] = useState({ title: '', video_url: '', duration: '' })
  const [addingVideo, setAddingVideo] = useState(false)
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url')
  const [muxResult, setMuxResult] = useState<{ assetId: string; playbackId: string; duration: number | null } | null>(null)

  // File upload state
  const [activeFileModuleId, setActiveFileModuleId] = useState<string | null>(null)
  const [fileUploading, setFileUploading] = useState(false)
  const [fileProgress, setFileProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  // Browser Supabase client — only used for Storage deletions
  const supabase = useMemo(() => createClient(), [])

  // ── API helpers ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/content`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load'); setLoading(false); return }
      setCourse(json.course)
      setModules(json.modules)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    }
    setLoading(false)
  }, [courseId])

  const callApi = async (action: string, body: object) => {
    const res = await fetch(`/api/admin/courses/${courseId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => { fetchData() }, [fetchData])

  const resetVideoForm = () => {
    setVideoForm({ title: '', video_url: '', duration: '' })
    setMuxResult(null)
    setUploadMode('url')
    setActiveModuleId(null)
  }

  const resetFileForm = () => {
    setSelectedFile(null)
    setFileName('')
    setFileProgress(0)
    setActiveFileModuleId(null)
  }

  const addModule = async () => {
    if (!newModuleTitle.trim()) return
    setAddingModule(true)
    setError(null)
    try {
      await callApi('addModule', { title: newModuleTitle.trim(), orderIndex: modules.length + 1 })
      setNewModuleTitle('')
      fetchData()
    } catch (e: any) {
      setError(e.message)
    }
    setAddingModule(false)
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its videos and files?')) return
    try {
      await callApi('deleteModule', { moduleId })
      fetchData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const addVideo = async (moduleId: string) => {
    if (!videoForm.title.trim()) return
    if (uploadMode === 'url' && !videoForm.video_url.trim()) return
    if (uploadMode === 'upload' && !muxResult) return

    setAddingVideo(true)
    setError(null)
    try {
      const body: any = {
        moduleId,
        title: videoForm.title.trim(),
        orderIndex: (modules.find(m => m.id === moduleId)?.videos.length || 0) + 1,
      }
      if (uploadMode === 'url') {
        body.videoUrl = videoForm.video_url.trim()
        body.duration = videoForm.duration ? parseInt(videoForm.duration) : null
      } else if (muxResult) {
        body.muxAssetId = muxResult.assetId
        body.muxPlaybackId = muxResult.playbackId
        body.duration = muxResult.duration
      }
      await callApi('addVideo', body)
      resetVideoForm()
      fetchData()
    } catch (e: any) {
      setError(e.message)
    }
    setAddingVideo(false)
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video?')) return
    try {
      await callApi('deleteVideo', { videoId })
      fetchData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const uploadFile = async (moduleId: string) => {
    if (!selectedFile || !fileName.trim()) return
    setFileUploading(true)
    setError(null)
    setFileProgress(0)

    try {
      // Upload via server-side admin API to bypass Storage RLS
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('moduleId', moduleId)
      form.append('fileName', fileName.trim())

      const uploadRes = await fetch(`/api/admin/courses/${courseId}/upload`, {
        method: 'POST',
        body: form,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed')

      const { publicUrl } = uploadJson
      const mod = modules.find(m => m.id === moduleId)
      await callApi('addFile', {
        moduleId,
        name: fileName.trim(),
        fileUrl: publicUrl,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        orderIndex: (mod?.files.length || 0) + 1,
      })

      resetFileForm()
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setFileUploading(false)
      setFileProgress(0)
    }
  }

  const deleteFile = async (fileId: string, fileUrl: string) => {
    if (!confirm('Delete this file?')) return
    // Remove from Storage (browser client OK for storage)
    const urlParts = fileUrl.split('/module-files/')
    if (urlParts[1]) {
      await supabase.storage.from('module-files').remove([decodeURIComponent(urlParts[1])])
    }
    // Remove DB record via admin API
    try {
      await callApi('deleteFile', { fileId })
      fetchData()
    } catch (e: any) {
      setError(e.message)
    }
  }

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
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <button suppressHydrationWarning onClick={() => router.push('/admin/courses')} className="text-[#B3B3B3] hover:text-[#EFEFEF] flex items-center gap-2 mb-4 transition-colors text-sm">
          ← Back to Courses
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-1 leading-tight truncate">
              {course?.title}
            </h1>
            <p className="text-[#B3B3B3] text-sm">Manage modules, videos and files</p>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${course?.published ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
              {course?.published ? 'PUBLISHED' : 'DRAFT'}
            </span>
            <button
              suppressHydrationWarning
              onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
              className="px-3 py-2 bg-[#3A3A3A] text-[#EFEFEF] rounded-lg font-semibold hover:bg-[#4A4A4A] transition-all text-sm whitespace-nowrap"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-[#2A2A2A] rounded-lg p-3 md:p-4 border-l-4 border-[#6A0DAD]">
          <p className="text-[#B3B3B3] text-xs md:text-sm">Modules</p>
          <p className="text-2xl md:text-3xl font-bold text-[#EFEFEF]">{modules.length}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-3 md:p-4 border-l-4 border-blue-500">
          <p className="text-[#B3B3B3] text-xs md:text-sm">Total Videos</p>
          <p className="text-2xl md:text-3xl font-bold text-[#EFEFEF]">{modules.reduce((acc, m) => acc + m.videos.length, 0)}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-3 md:p-4 border-l-4 border-orange-500">
          <p className="text-[#B3B3B3] text-xs md:text-sm">Total Files</p>
          <p className="text-2xl md:text-3xl font-bold text-[#EFEFEF]">{modules.reduce((acc, m) => acc + m.files.length, 0)}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-3 md:p-4 border-l-4 border-green-500">
          <p className="text-[#B3B3B3] text-xs md:text-sm">Price</p>
          <p className="text-2xl md:text-3xl font-bold text-[#EFEFEF]">{course?.is_free ? 'Free' : course?.price_cash != null ? `${course.price_cash} EGP` : '—'}</p>
        </div>
      </div>

      {/* Modules list */}
      <div className="space-y-3 md:space-y-4 mb-6">
        {modules.length === 0 && (
          <div className="text-center py-12 text-[#B3B3B3]">
            No modules yet — add one below to get started
          </div>
        )}

        {modules.map((mod, modIndex) => (
          <div key={mod.id} className="bg-[#2A2A2A] rounded-xl overflow-hidden border-2 border-[#3A3A3A]">
            {/* Module header */}
            <div className="flex flex-col gap-3 px-4 md:px-6 py-4 bg-[#3A3A3A] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 bg-[#6A0DAD] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {modIndex + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[#EFEFEF] font-bold text-base md:text-lg leading-tight truncate">{mod.title}</h3>
                  <span className="text-[#B3B3B3] text-xs">
                    ({mod.videos.length} video{mod.videos.length !== 1 ? 's' : ''}, {mod.files.length} file{mod.files.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    if (activeModuleId === mod.id) { resetVideoForm() }
                    else { resetVideoForm(); resetFileForm(); setActiveModuleId(mod.id) }
                  }}
                  className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${
                    activeModuleId === mod.id
                      ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]'
                      : 'bg-[#6A0DAD] text-white hover:bg-[#8B2CAD]'
                  }`}
                >
                  {activeModuleId === mod.id ? '✕ Video' : '🎬 Add Video'}
                </button>
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    if (activeFileModuleId === mod.id) { resetFileForm() }
                    else { resetFileForm(); resetVideoForm(); setActiveFileModuleId(mod.id) }
                  }}
                  className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${
                    activeFileModuleId === mod.id
                      ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]'
                      : 'bg-orange-600 text-white hover:bg-orange-500'
                  }`}
                >
                  {activeFileModuleId === mod.id ? '✕ File' : '📎 Add File'}
                </button>
                <button
                  suppressHydrationWarning
                  onClick={() => deleteModule(mod.id)}
                  className="px-3 py-2 bg-red-600/30 text-red-400 text-xs md:text-sm font-semibold rounded hover:bg-red-600/50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Videos list */}
            {mod.videos.length > 0 && (
              <div className="divide-y divide-[#3A3A3A]">
                {mod.videos.map((video, vidIndex) => (
                  <div key={video.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-[#3A3A3A]/50 transition-colors gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <span className="text-[#6A0DAD] font-bold text-sm w-5 flex-shrink-0">{vidIndex + 1}.</span>
                      <span className="text-base md:text-lg flex-shrink-0">🎬</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#EFEFEF] font-semibold text-sm md:text-base truncate">{video.title}</p>
                          {video.mux_playback_id ? (
                            <span className="px-2 py-0.5 bg-[#6A0DAD]/30 text-[#B3B3B3] text-xs font-bold rounded-full border border-[#6A0DAD]/40">MUX</span>
                          ) : video.video_url?.includes('youtube') ? (
                            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-bold rounded-full border border-red-700/40">YT</span>
                          ) : video.video_url ? (
                            <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-full border border-blue-700/40">URL</span>
                          ) : null}
                        </div>
                        {video.video_url && (
                          <p className="text-[#555] text-xs truncate max-w-[140px] md:max-w-md">{video.video_url}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      {video.duration && (
                        <span className="text-[#B3B3B3] text-xs md:text-sm hidden sm:inline">
                          {Math.floor(video.duration / 60)}m {video.duration % 60}s
                        </span>
                      )}
                      <button suppressHydrationWarning onClick={() => deleteVideo(video.id)} className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Files list */}
            {mod.files.length > 0 && (
              <div className="divide-y divide-[#3A3A3A] border-t border-[#3A3A3A]">
                {mod.files.map((file, fileIndex) => (
                  <div key={file.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-orange-500/5 transition-colors gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <span className="text-orange-500 font-bold text-sm w-5 flex-shrink-0">{fileIndex + 1}.</span>
                      <span className="text-lg md:text-xl flex-shrink-0">{fileIcon(file.file_type)}</span>
                      <div className="min-w-0">
                        <p className="text-[#EFEFEF] font-semibold text-sm md:text-base truncate">{file.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 text-xs font-bold rounded-full border border-orange-600/30">
                            {file.file_type?.includes('pdf') ? 'PDF' : file.file_type?.includes('word') ? 'DOC' : 'FILE'}
                          </span>
                          {file.file_size && (
                            <span className="text-[#555] text-xs hidden sm:inline">{formatBytes(file.file_size)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-[#B3B3B3] hover:text-[#EFEFEF] text-xs md:text-sm transition-colors whitespace-nowrap">
                        Preview
                      </a>
                      <button suppressHydrationWarning onClick={() => deleteFile(file.id, file.file_url)} className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {mod.videos.length === 0 && mod.files.length === 0 && activeModuleId !== mod.id && activeFileModuleId !== mod.id && (
              <p className="px-6 py-4 text-[#B3B3B3] text-sm italic">
                No content yet — add a video or file to get started
              </p>
            )}

            {/* Add video inline form */}
            {activeModuleId === mod.id && (
              <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-[#6A0DAD]">
                <p className="text-[#B3B3B3] text-sm font-bold uppercase tracking-wider mb-4">🎬 Add New Video</p>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Video title *"
                    value={videoForm.title}
                    onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600"
                  />
                  <div className="flex gap-2">
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => { setUploadMode('url'); setMuxResult(null) }}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${uploadMode === 'url' ? 'bg-[#6A0DAD] text-white border-[#6A0DAD]' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-[#6A0DAD]'}`}
                    >
                      🔗 YouTube / URL
                    </button>
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => { setUploadMode('upload'); setVideoForm(p => ({ ...p, video_url: '' })) }}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${uploadMode === 'upload' ? 'bg-[#6A0DAD] text-white border-[#6A0DAD]' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-[#6A0DAD]'}`}
                    >
                      ☁️ Upload to Mux
                    </button>
                  </div>
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
                        placeholder="Duration in seconds (optional)"
                        value={videoForm.duration}
                        onChange={e => setVideoForm(p => ({ ...p, duration: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600"
                      />
                    </div>
                  )}
                  {uploadMode === 'upload' && (
                    <MuxVideoUploader
                      onSuccess={(result) => setMuxResult(result)}
                      onError={(err) => setError(err)}
                    />
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      suppressHydrationWarning
                      onClick={() => addVideo(mod.id)}
                      disabled={addingVideo || !canAddVideo(mod.id)}
                      className="px-5 py-2 bg-[#6A0DAD] text-white text-sm font-bold rounded-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addingVideo ? 'Saving...' : 'Save Video'}
                    </button>
                    <button suppressHydrationWarning onClick={resetVideoForm} className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A] transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add file inline form */}
            {activeFileModuleId === mod.id && (
              <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-orange-600">
                <p className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-4">📎 Add File (PDF, Word, Image)</p>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Display name, e.g. Chapter 1 Book PDF *"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-orange-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600"
                  />

                  <div
                    className="relative border-2 border-dashed border-[#3A3A3A] hover:border-orange-500 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                    onClick={() => document.getElementById('file-input-' + mod.id)?.click()}
                  >
                    <input
                      id={'file-input-' + mod.id}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) {
                          setSelectedFile(f)
                          if (!fileName) setFileName(f.name.replace(/\.[^/.]+$/, ''))
                        }
                      }}
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl">{fileIcon(selectedFile.type)}</span>
                        <div className="text-left">
                          <p className="text-[#EFEFEF] font-semibold">{selectedFile.name}</p>
                          <p className="text-[#B3B3B3] text-xs">{formatBytes(selectedFile.size)}</p>
                        </div>
                        <button
                          suppressHydrationWarning
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelectedFile(null) }}
                          className="ml-4 text-red-400 hover:text-red-300 text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-4xl mb-2">📂</p>
                        <p className="text-[#EFEFEF] font-semibold group-hover:text-orange-400 transition-colors">Click to select a file</p>
                        <p className="text-[#555] text-xs mt-1">PDF, Word, JPG, PNG — max 50MB</p>
                      </div>
                    )}
                  </div>

                  {fileUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-[#B3B3B3]">
                        <span>Uploading...</span>
                      </div>
                      <div className="w-full bg-[#3A3A3A] rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full animate-pulse w-full" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      suppressHydrationWarning
                      onClick={() => uploadFile(mod.id)}
                      disabled={fileUploading || !selectedFile || !fileName.trim()}
                      className="px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {fileUploading ? 'Uploading...' : '⬆ Upload File'}
                    </button>
                    <button suppressHydrationWarning onClick={resetFileForm} className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A] transition-all">
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
      <div className="bg-[#2A2A2A] rounded-xl p-4 md:p-6 border-2 border-dashed border-[#3A3A3A] hover:border-[#6A0DAD] transition-colors">
        <p className="text-[#B3B3B3] text-sm font-bold uppercase tracking-wider mb-3">Add New Module</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Module title, e.g. Chapter 1: Introduction to Mechanics"
            value={newModuleTitle}
            onChange={e => setNewModuleTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addModule()}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors placeholder:text-gray-600 text-sm"
          />
          <button
            suppressHydrationWarning
            onClick={addModule}
            disabled={addingModule || !newModuleTitle.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-[#6A0DAD] text-white font-bold rounded-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {addingModule ? 'Adding...' : '+ Add Module'}
          </button>
        </div>
      </div>
    </div>
  )
}
