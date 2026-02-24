'use client'

import { use, useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MuxVideoUploader } from '@/components/MuxVideoUploader'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Video { id: string; title: string; video_url: string | null; mux_playback_id: string | null; duration: number | null }
interface ModuleFile { id: string; name: string; file_url: string; file_size: number | null; file_type: string | null; order_index: number }
interface QuizQuestion { id?: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct: 'a'|'b'|'c'|'d' }
interface Quiz { id: string; title: string; order_index: number; quiz_questions: QuizQuestion[] }
interface ExamQuestionItem { id: string; image_url: string; correct: 'a'|'b'|'c'|'d'; order_index: number }
interface ModuleExam { id: string; title: string; exam_question_items: ExamQuestionItem[] }
interface Module {
  id: string; title: string; module_type: 'lesson'|'exam'
  videos: Video[]; files: ModuleFile[]; quizzes: Quiz[]; exam: ModuleExam | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function fileIcon(type: string | null) {
  if (!type) return '📄'
  if (type.includes('pdf')) return '📕'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('image')) return '🖼️'
  return '📄'
}

const BLANK_QUESTION = (): QuizQuestion => ({
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct: 'a',
})

// ─── Component ────────────────────────────────────────────────────────────────
export default function CourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params)
  const router = useRouter()

  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Module creation
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleType, setNewModuleType] = useState<'lesson'|'exam'>('lesson')

  // Video form
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [videoForm, setVideoForm] = useState({ title: '', video_url: '', duration: '' })
  const [addingVideo, setAddingVideo] = useState(false)
  const [uploadMode, setUploadMode] = useState<'url'|'upload'>('url')
  const [muxResult, setMuxResult] = useState<{ assetId: string; playbackId: string; duration: number | null } | null>(null)

  // File form
  const [activeFileModuleId, setActiveFileModuleId] = useState<string | null>(null)
  const [fileUploading, setFileUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  // Quiz form
  const [activeQuizModuleId, setActiveQuizModuleId] = useState<string | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    Array.from({ length: 10 }, BLANK_QUESTION)
  )
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Exam question form (per exam module)
  const [activeExamModuleId, setActiveExamModuleId] = useState<string | null>(null)
  const [examImageFile, setExamImageFile] = useState<File | null>(null)
  const [examImageCorrect, setExamImageCorrect] = useState<'a'|'b'|'c'|'d'>('a')
  const [uploadingExamImage, setUploadingExamImage] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // ── API helpers ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/content`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load'); setLoading(false); return }
      setCourse(json.course); setModules(json.modules)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const callApi = async (action: string, body: object) => {
    const res = await fetch(`/api/admin/courses/${courseId}/content`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetVideoForm = () => {
    setVideoForm({ title: '', video_url: '', duration: '' })
    setMuxResult(null); setUploadMode('url'); setActiveModuleId(null)
  }
  const resetFileForm = () => {
    setSelectedFile(null); setFileName(''); setActiveFileModuleId(null)
  }
  const resetQuizForm = () => {
    setQuizTitle(''); setQuizQuestions(Array.from({ length: 10 }, BLANK_QUESTION))
    setActiveQuizModuleId(null)
  }
  const resetExamForm = () => {
    setExamImageFile(null); setExamImageCorrect('a'); setActiveExamModuleId(null)
  }

  // ── Module actions ────────────────────────────────────────────────────────
  const addModule = async () => {
    if (!newModuleTitle.trim()) return
    setAddingModule(true); setError(null)
    try {
      await callApi('addModule', { title: newModuleTitle.trim(), orderIndex: modules.length + 1, moduleType: newModuleType })
      setNewModuleTitle(''); fetchData()
    } catch (e: any) { setError(e.message) }
    setAddingModule(false)
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its content?')) return
    try { await callApi('deleteModule', { moduleId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  // ── Video actions ─────────────────────────────────────────────────────────
  const addVideo = async (moduleId: string) => {
    if (!videoForm.title.trim()) return
    if (uploadMode === 'url' && !videoForm.video_url.trim()) return
    if (uploadMode === 'upload' && !muxResult) return
    setAddingVideo(true); setError(null)
    try {
      const body: any = { moduleId, title: videoForm.title.trim(), orderIndex: (modules.find(m => m.id === moduleId)?.videos.length || 0) + 1 }
      if (uploadMode === 'url') { body.videoUrl = videoForm.video_url.trim(); body.duration = videoForm.duration ? parseInt(videoForm.duration) : null }
      else if (muxResult) { body.muxAssetId = muxResult.assetId; body.muxPlaybackId = muxResult.playbackId; body.duration = muxResult.duration }
      await callApi('addVideo', body); resetVideoForm(); fetchData()
    } catch (e: any) { setError(e.message) }
    setAddingVideo(false)
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video?')) return
    try { await callApi('deleteVideo', { videoId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  // ── File actions ──────────────────────────────────────────────────────────
  const uploadFile = async (moduleId: string) => {
    if (!selectedFile || !fileName.trim()) return
    setFileUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', selectedFile); form.append('moduleId', moduleId); form.append('fileName', fileName.trim())
      const uploadRes = await fetch(`/api/admin/courses/${courseId}/upload`, { method: 'POST', body: form })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed')
      const mod = modules.find(m => m.id === moduleId)
      await callApi('addFile', { moduleId, name: fileName.trim(), fileUrl: uploadJson.publicUrl, fileSize: selectedFile.size, fileType: selectedFile.type, orderIndex: (mod?.files.length || 0) + 1 })
      resetFileForm(); fetchData()
    } catch (err: any) { setError(err.message) }
    setFileUploading(false)
  }

  const deleteFile = async (fileId: string, fileUrl: string) => {
    if (!confirm('Delete this file?')) return
    const urlParts = fileUrl.split('/module-files/')
    if (urlParts[1]) await supabase.storage.from('module-files').remove([decodeURIComponent(urlParts[1])])
    try { await callApi('deleteFile', { fileId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  // ── Quiz actions ──────────────────────────────────────────────────────────
  const saveQuiz = async (moduleId: string) => {
    if (!quizTitle.trim()) { setError('Quiz needs a title'); return }
    const filled = quizQuestions.filter(q => q.question_text.trim() && q.option_a && q.option_b && q.option_c && q.option_d)
    if (filled.length === 0) { setError('Add at least 1 complete question'); return }
    setSavingQuiz(true); setError(null)
    try {
      const mod = modules.find(m => m.id === moduleId)
      await callApi('addQuiz', { moduleId, title: quizTitle.trim(), orderIndex: (mod?.quizzes.length || 0) + 1, questions: filled })
      resetQuizForm(); fetchData()
    } catch (e: any) { setError(e.message) }
    setSavingQuiz(false)
  }

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Delete this quiz?')) return
    try { await callApi('deleteQuiz', { quizId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: string) => {
    setQuizQuestions(prev => { const next = [...prev]; (next[idx] as any)[field] = value; return next })
  }

  // ── Exam question actions ─────────────────────────────────────────────────
  const uploadExamQuestion = async (examId: string, moduleId: string) => {
    if (!examImageFile) return
    setUploadingExamImage(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', examImageFile); form.append('examId', examId)
      const res = await fetch(`/api/admin/courses/${courseId}/upload-exam-image`, { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      const mod = modules.find(m => m.id === moduleId)
      const currentCount = mod?.exam?.exam_question_items.length || 0
      await callApi('addExamQuestion', { examId, imageUrl: json.publicUrl, correct: examImageCorrect, orderIndex: currentCount + 1 })
      setExamImageFile(null); setExamImageCorrect('a'); fetchData()
    } catch (e: any) { setError(e.message) }
    setUploadingExamImage(false)
  }

  const deleteExamQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return
    try { await callApi('deleteExamQuestion', { questionId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-[#B3B3B3] text-xl animate-pulse">Loading course content...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <button suppressHydrationWarning onClick={() => router.push('/admin/courses')} className="text-[#B3B3B3] hover:text-[#EFEFEF] flex items-center gap-2 mb-4 transition-colors text-sm">
          ← Back to Courses
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-1 leading-tight truncate">{course?.title}</h1>
            <p className="text-[#B3B3B3] text-sm">Manage modules, videos, files, quizzes and exams</p>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${course?.published ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
              {course?.published ? 'PUBLISHED' : 'DRAFT'}
            </span>
            <button suppressHydrationWarning onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
              className="px-3 py-2 bg-[#3A3A3A] text-[#EFEFEF] rounded-lg font-semibold hover:bg-[#4A4A4A] transition-all text-sm whitespace-nowrap">
              Edit Details
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'Modules', value: modules.length, color: 'border-[#6A0DAD]' },
          { label: 'Total Videos', value: modules.reduce((a, m) => a + m.videos.length, 0), color: 'border-blue-500' },
          { label: 'Quizzes', value: modules.reduce((a, m) => a + (m.quizzes?.length || 0), 0), color: 'border-yellow-500' },
          { label: 'Price', value: course?.is_free ? 'Free' : course?.price_cash != null ? `${course.price_cash} EGP` : '—', color: 'border-green-500' },
        ].map(s => (
          <div key={s.label} className={`bg-[#2A2A2A] rounded-lg p-3 md:p-4 border-l-4 ${s.color}`}>
            <p className="text-[#B3B3B3] text-xs md:text-sm">{s.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-[#EFEFEF]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div className="space-y-3 md:space-y-4 mb-6">
        {modules.length === 0 && (
          <div className="text-center py-12 text-[#B3B3B3]">No modules yet — add one below</div>
        )}

        {modules.map((mod, modIndex) => (
          <div key={mod.id} className={`bg-[#2A2A2A] rounded-xl overflow-hidden border-2 ${mod.module_type === 'exam' ? 'border-yellow-600/50' : 'border-[#3A3A3A]'}`}>

            {/* Module Header */}
            <div className={`flex flex-col gap-3 px-4 md:px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${mod.module_type === 'exam' ? 'bg-yellow-900/20' : 'bg-[#3A3A3A]'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${mod.module_type === 'exam' ? 'bg-yellow-600' : 'bg-[#6A0DAD]'}`}>
                  {modIndex + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[#EFEFEF] font-bold text-base md:text-lg leading-tight truncate">{mod.title}</h3>
                    {mod.module_type === 'exam' && (
                      <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/40">EXAM</span>
                    )}
                  </div>
                  <span className="text-[#B3B3B3] text-xs">
                    {mod.module_type === 'exam'
                      ? `${mod.exam?.exam_question_items.length || 0} question(s)`
                      : `${mod.videos.length} video(s), ${mod.quizzes?.length || 0} quiz(zes)`}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {mod.module_type === 'lesson' && (<>
                  {/* Add Video */}
                  <button suppressHydrationWarning
                    onClick={() => { if (activeModuleId === mod.id) resetVideoForm(); else { resetVideoForm(); resetFileForm(); resetQuizForm(); resetExamForm(); setActiveModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-[#6A0DAD] text-white hover:bg-[#8B2CAD]'}`}>
                    {activeModuleId === mod.id ? '✕ Video' : '🎬 Add Video'}
                  </button>
                  {/* Add File */}
                  <button suppressHydrationWarning
                    onClick={() => { if (activeFileModuleId === mod.id) resetFileForm(); else { resetFileForm(); resetVideoForm(); resetQuizForm(); resetExamForm(); setActiveFileModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeFileModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-orange-600 text-white hover:bg-orange-500'}`}>
                    {activeFileModuleId === mod.id ? '✕ File' : '📎 Add File'}
                  </button>
                  {/* Add Quiz */}
                  <button suppressHydrationWarning
                    onClick={() => { if (activeQuizModuleId === mod.id) resetQuizForm(); else { resetQuizForm(); resetVideoForm(); resetFileForm(); resetExamForm(); setActiveQuizModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeQuizModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>
                    {activeQuizModuleId === mod.id ? '✕ Quiz' : '📝 Add Quiz'}
                  </button>
                </>)}

                {mod.module_type === 'exam' && mod.exam && (
                  <button suppressHydrationWarning
                    onClick={() => { if (activeExamModuleId === mod.id) resetExamForm(); else { resetExamForm(); setActiveExamModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeExamModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>
                    {activeExamModuleId === mod.id ? '✕ Cancel' : '🖼️ Add Question'}
                  </button>
                )}

                <button suppressHydrationWarning onClick={() => deleteModule(mod.id)}
                  className="px-3 py-2 bg-red-600/30 text-red-400 text-xs md:text-sm font-semibold rounded hover:bg-red-600/50 transition-colors">
                  Delete
                </button>
              </div>
            </div>

            {/* ── LESSON MODULE CONTENT ── */}
            {mod.module_type === 'lesson' && (<>
              {/* Videos */}
              {mod.videos.length > 0 && (
                <div className="divide-y divide-[#3A3A3A]">
                  {mod.videos.map((video, vi) => (
                    <div key={video.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-[#3A3A3A]/50 transition-colors gap-2">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <span className="text-[#6A0DAD] font-bold text-sm w-5 flex-shrink-0">{vi + 1}.</span>
                        <span className="text-base md:text-lg flex-shrink-0">🎬</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[#EFEFEF] font-semibold text-sm md:text-base truncate">{video.title}</p>
                            {video.mux_playback_id ? <span className="px-2 py-0.5 bg-[#6A0DAD]/30 text-[#B3B3B3] text-xs font-bold rounded-full border border-[#6A0DAD]/40">MUX</span>
                              : video.video_url?.includes('youtube') ? <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-bold rounded-full border border-red-700/40">YT</span>
                              : <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-full border border-blue-700/40">URL</span>}
                          </div>
                          {video.video_url && <p className="text-[#555] text-xs truncate max-w-[140px] md:max-w-md">{video.video_url}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        {video.duration && <span className="text-[#B3B3B3] text-xs md:text-sm hidden sm:inline">{Math.floor(video.duration / 60)}m {video.duration % 60}s</span>}
                        <button suppressHydrationWarning onClick={() => deleteVideo(video.id)} className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              {mod.files.length > 0 && (
                <div className="divide-y divide-[#3A3A3A] border-t border-[#3A3A3A]">
                  {mod.files.map((file, fi) => (
                    <div key={file.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-orange-500/5 transition-colors gap-2">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <span className="text-orange-500 font-bold text-sm w-5 flex-shrink-0">{fi + 1}.</span>
                        <span className="text-lg md:text-xl flex-shrink-0">{fileIcon(file.file_type)}</span>
                        <div className="min-w-0">
                          <p className="text-[#EFEFEF] font-semibold text-sm md:text-base truncate">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 text-xs font-bold rounded-full border border-orange-600/30">
                              {file.file_type?.includes('pdf') ? 'PDF' : file.file_type?.includes('word') ? 'DOC' : 'FILE'}
                            </span>
                            {file.file_size && <span className="text-[#555] text-xs hidden sm:inline">{formatBytes(file.file_size)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-[#B3B3B3] hover:text-[#EFEFEF] text-xs md:text-sm transition-colors whitespace-nowrap">Preview</a>
                        <button suppressHydrationWarning onClick={() => deleteFile(file.id, file.file_url)} className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quizzes */}
              {(mod.quizzes?.length ?? 0) > 0 && (
                <div className="divide-y divide-[#3A3A3A] border-t border-[#3A3A3A]">
                  {mod.quizzes.map(quiz => (
                    <div key={quiz.id} className="px-4 md:px-6 py-3 hover:bg-yellow-500/5 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-yellow-400 text-xl flex-shrink-0">📝</span>
                          <div className="min-w-0">
                            <p className="text-[#EFEFEF] font-semibold text-sm md:text-base truncate">{quiz.title}</p>
                            <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/30">
                              QUIZ · {quiz.quiz_questions.length} questions
                            </span>
                          </div>
                        </div>
                        <button suppressHydrationWarning onClick={() => deleteQuiz(quiz.id)}
                          className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {mod.videos.length === 0 && mod.files.length === 0 && (mod.quizzes?.length ?? 0) === 0
                && activeModuleId !== mod.id && activeFileModuleId !== mod.id && activeQuizModuleId !== mod.id && (
                <p className="px-4 md:px-6 py-4 text-[#B3B3B3] text-sm italic">No content yet — add a video, file, or quiz</p>
              )}

              {/* Add Video Form */}
              {activeModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-[#6A0DAD]">
                  <p className="text-[#B3B3B3] text-sm font-bold uppercase tracking-wider mb-4">🎬 Add New Video</p>
                  <div className="space-y-4">
                    <input type="text" placeholder="Video title *" value={videoForm.title}
                      onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                    <div className="flex gap-2">
                      {(['url','upload'] as const).map(mode => (
                        <button key={mode} suppressHydrationWarning type="button"
                          onClick={() => { setUploadMode(mode); if (mode === 'url') setMuxResult(null) }}
                          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${uploadMode === mode ? 'bg-[#6A0DAD] text-white border-[#6A0DAD]' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-[#6A0DAD]'}`}>
                          {mode === 'url' ? '🔗 YouTube / URL' : '☁️ Upload to Mux'}
                        </button>
                      ))}
                    </div>
                    {uploadMode === 'url' && (
                      <div className="space-y-3">
                        <input type="text" placeholder="YouTube URL or direct video URL *" value={videoForm.video_url}
                          onChange={e => setVideoForm(p => ({ ...p, video_url: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                        <input type="number" placeholder="Duration in seconds (optional)" value={videoForm.duration}
                          onChange={e => setVideoForm(p => ({ ...p, duration: e.target.value }))}
                          className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                      </div>
                    )}
                    {uploadMode === 'upload' && (
                      <MuxVideoUploader onSuccess={r => setMuxResult(r)} onError={err => setError(err)} />
                    )}
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => addVideo(mod.id)} disabled={addingVideo}
                        className="px-5 py-2 bg-[#6A0DAD] text-white text-sm font-bold rounded-lg hover:bg-[#8B2CAD] transition-all disabled:opacity-40">
                        {addingVideo ? 'Saving...' : 'Save Video'}
                      </button>
                      <button suppressHydrationWarning onClick={resetVideoForm} className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A] transition-all">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add File Form */}
              {activeFileModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-orange-600">
                  <p className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-4">📎 Add File</p>
                  <div className="space-y-4">
                    <input type="text" placeholder="Display name *" value={fileName} onChange={e => setFileName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-orange-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                    <div className="relative border-2 border-dashed border-[#3A3A3A] hover:border-orange-500 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                      onClick={() => document.getElementById(`file-input-${mod.id}`)?.click()}>
                      <input id={`file-input-${mod.id}`} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); if (!fileName) setFileName(f.name.replace(/\.[^/.]+$/, '')) } }} />
                      {selectedFile
                        ? <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl">{fileIcon(selectedFile.type)}</span>
                            <div className="text-left"><p className="text-[#EFEFEF] font-semibold">{selectedFile.name}</p><p className="text-[#B3B3B3] text-xs">{formatBytes(selectedFile.size)}</p></div>
                            <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null) }} className="ml-4 text-red-400 text-sm font-bold">✕</button>
                          </div>
                        : <div><p className="text-4xl mb-2">📂</p><p className="text-[#EFEFEF] font-semibold group-hover:text-orange-400">Click to select file</p><p className="text-[#555] text-xs mt-1">PDF, Word, JPG, PNG</p></div>}
                    </div>
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => uploadFile(mod.id)} disabled={fileUploading || !selectedFile || !fileName.trim()}
                        className="px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-500 transition-all disabled:opacity-40">
                        {fileUploading ? 'Uploading...' : '⬆ Upload File'}
                      </button>
                      <button suppressHydrationWarning onClick={resetFileForm} className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A]">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Quiz Form */}
              {activeQuizModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-yellow-600">
                  <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">📝 Create Quiz</p>
                  <div className="space-y-5">
                    <input type="text" placeholder="Quiz title *" value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />

                    <div className="space-y-6">
                      {quizQuestions.map((q, idx) => (
                        <div key={idx} className="bg-[#2A2A2A] rounded-xl p-4 border border-[#3A3A3A]">
                          <p className="text-yellow-400 text-xs font-bold uppercase mb-3">Question {idx + 1}</p>
                          <input type="text" placeholder={`Question ${idx + 1} text`} value={q.question_text}
                            onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3A3A3A] focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600 mb-3" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {(['a','b','c','d'] as const).map(opt => (
                              <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${q.correct === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#1a1a1a]'}`}>
                                <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${q.correct === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                                <input type="text" placeholder={`Option ${opt.toUpperCase()}`} value={(q as any)[`option_${opt}`]}
                                  onChange={e => updateQuestion(idx, `option_${opt}` as keyof QuizQuestion, e.target.value)}
                                  className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#B3B3B3] text-xs font-semibold">Correct answer:</span>
                            <div className="flex gap-2">
                              {(['a','b','c','d'] as const).map(opt => (
                                <button key={opt} type="button" suppressHydrationWarning
                                  onClick={() => updateQuestion(idx, 'correct', opt)}
                                  className={`w-8 h-8 rounded-full text-xs font-black uppercase transition-all ${q.correct === opt ? 'bg-green-500 text-white' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => saveQuiz(mod.id)} disabled={savingQuiz}
                        className="px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-40">
                        {savingQuiz ? 'Saving...' : '💾 Save Quiz'}
                      </button>
                      <button suppressHydrationWarning onClick={resetQuizForm} className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A]">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </>)}

            {/* ── EXAM MODULE CONTENT ── */}
            {mod.module_type === 'exam' && mod.exam && (<>
              {mod.exam.exam_question_items.length > 0 && (
                <div className="divide-y divide-[#3A3A3A]">
                  {mod.exam.exam_question_items.map((item, qi) => (
                    <div key={item.id} className="flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-yellow-500/5 transition-colors">
                      <span className="text-yellow-500 font-bold text-sm w-6 flex-shrink-0">Q{qi + 1}</span>
                      <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-[#3A3A3A] bg-[#1a1a1a]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image_url} alt={`Q${qi + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm font-black rounded-full border border-green-600/30 uppercase">
                          Answer: {item.correct}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="text-[#B3B3B3] hover:text-[#EFEFEF] text-xs transition-colors">View</a>
                        <button suppressHydrationWarning onClick={() => deleteExamQuestion(item.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mod.exam.exam_question_items.length === 0 && activeExamModuleId !== mod.id && (
                <p className="px-4 md:px-6 py-4 text-[#B3B3B3] text-sm italic">No questions yet — click "Add Question" to upload images</p>
              )}

              {/* Add Exam Question Form */}
              {activeExamModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-yellow-600">
                  <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">🖼️ Add Exam Question</p>
                  <p className="text-[#B3B3B3] text-xs mb-4">Upload an image of the question (PDF screenshot, photo, etc.). Students will see the image and pick A/B/C/D.</p>
                  <div className="space-y-4">
                    {/* Image upload */}
                    <div className="relative border-2 border-dashed border-[#3A3A3A] hover:border-yellow-500 rounded-xl p-6 text-center cursor-pointer transition-colors group"
                      onClick={() => document.getElementById(`exam-img-${mod.id}`)?.click()}>
                      <input id={`exam-img-${mod.id}`} type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) setExamImageFile(f) }} />
                      {examImageFile
                        ? <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl">🖼️</span>
                            <div className="text-left"><p className="text-[#EFEFEF] font-semibold">{examImageFile.name}</p><p className="text-[#B3B3B3] text-xs">{formatBytes(examImageFile.size)}</p></div>
                            <button type="button" onClick={e => { e.stopPropagation(); setExamImageFile(null) }} className="ml-4 text-red-400 text-sm font-bold">✕</button>
                          </div>
                        : <div><p className="text-4xl mb-2">📸</p><p className="text-[#EFEFEF] font-semibold group-hover:text-yellow-400">Click to upload question image</p><p className="text-[#555] text-xs mt-1">PNG, JPG, WEBP — screenshot your PDF page</p></div>}
                    </div>

                    {/* Correct answer selector */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-[#B3B3B3] text-sm font-semibold">Correct answer:</span>
                      <div className="flex gap-2">
                        {(['a','b','c','d'] as const).map(opt => (
                          <button key={opt} suppressHydrationWarning type="button"
                            onClick={() => setExamImageCorrect(opt)}
                            className={`w-12 h-12 rounded-xl text-sm font-black uppercase transition-all ${examImageCorrect === opt ? 'bg-green-500 text-white scale-110' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => uploadExamQuestion(mod.exam!.id, mod.id)} disabled={uploadingExamImage || !examImageFile}
                        className="px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-40">
                        {uploadingExamImage ? 'Uploading...' : '⬆ Add Question'}
                      </button>
                      <button suppressHydrationWarning onClick={resetExamForm} className="px-5 py-2 bg-[#3A3A3A] text-[#EFEFEF] text-sm font-bold rounded-lg hover:bg-[#4A4A4A]">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </>)}
          </div>
        ))}
      </div>

      {/* Add Module */}
      <div className="bg-[#2A2A2A] rounded-xl p-4 md:p-6 border-2 border-dashed border-[#3A3A3A] hover:border-[#6A0DAD] transition-colors">
        <p className="text-[#B3B3B3] text-sm font-bold uppercase tracking-wider mb-3">Add New Module</p>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          <button suppressHydrationWarning type="button" onClick={() => setNewModuleType('lesson')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${newModuleType === 'lesson' ? 'bg-[#6A0DAD] text-white border-[#6A0DAD]' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-[#6A0DAD]'}`}>
            📚 Lesson Module
          </button>
          <button suppressHydrationWarning type="button" onClick={() => setNewModuleType('exam')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${newModuleType === 'exam' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-yellow-600'}`}>
            📋 Exam Module
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input type="text" placeholder={newModuleType === 'exam' ? 'Exam title, e.g. Final Exam' : 'Module title, e.g. Chapter 1: Introduction'}
            value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addModule()}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-lg text-[#EFEFEF] outline-none transition-colors placeholder:text-gray-600 text-sm" />
          <button suppressHydrationWarning onClick={addModule} disabled={addingModule || !newModuleTitle.trim()}
            className={`w-full sm:w-auto px-6 py-3 text-white font-bold rounded-lg transition-all disabled:opacity-50 whitespace-nowrap ${newModuleType === 'exam' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-[#6A0DAD] hover:bg-[#8B2CAD]'}`}>
            {addingModule ? 'Adding...' : `+ Add ${newModuleType === 'exam' ? 'Exam' : 'Module'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
