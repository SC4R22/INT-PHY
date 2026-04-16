/* eslint-disable react/no-unescaped-entities */
'use client'

import { use, useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MuxVideoUploader } from '@/components/MuxVideoUploader'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoChapter { id: string; title: string; start_time: number; order_index: number }
interface Video { id: string; title: string; video_url: string | null; mux_playback_id: string | null; duration: number | null; chapters: VideoChapter[] }
interface ModuleFile { id: string; name: string; file_url: string; file_size: number | null; file_type: string | null; order_index: number }
interface QuizQuestion { id?: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct: 'a'|'b'|'c'|'d'; solution: string }
interface Quiz { id: string; title: string; order_index: number; quiz_questions: QuizQuestion[] }
interface ExamQuestionItem { id: string; image_url: string | null; question_text: string | null; option_a: string | null; option_b: string | null; option_c: string | null; option_d: string | null; correct: 'a'|'b'|'c'|'d'; order_index: number; solution: string | null }
interface ModuleExam { id: string; title: string; exam_question_items: ExamQuestionItem[] }
interface Module {
  id: string; title: string; module_type: 'lesson'|'exam'|'homework'
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
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1].split('?')[0]
  } catch {}
  return null
}

const BLANK_QUESTION = (): QuizQuestion => ({
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct: 'a', solution: '',
})

function SolutionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-900/10 p-3">
      <label className="block text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span>💡</span>الشرح / مفتاح الإجابة (اختياري)
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder="اكتب شرح الإجابة هنا — هيظهر للطالب بعد تسليم الاختبار..."
        rows={2}
        className="w-full px-3 py-2 bg-[#1a1a1a] border border-blue-500/20 focus:border-blue-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600 resize-none leading-relaxed"
      />
    </div>
  )
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
  const [newModuleType, setNewModuleType] = useState<'lesson'|'exam'|'homework'>('lesson')

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [videoForm, setVideoForm] = useState({ title: '', video_url: '', duration: '' })
  const [addingVideo, setAddingVideo] = useState(false)
  const [uploadMode, setUploadMode] = useState<'youtube'|'url'|'upload'>('youtube')
  const [muxResult, setMuxResult] = useState<{ assetId: string; playbackId: string; duration: number | null } | null>(null)

  const [activeFileModuleId, setActiveFileModuleId] = useState<string | null>(null)
  const [fileUploading, setFileUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')

  const [activeQuizModuleId, setActiveQuizModuleId] = useState<string | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(Array.from({ length: 10 }, BLANK_QUESTION))
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Chapter state
  const [activeChapterVideoId, setActiveChapterVideoId] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterStartTime, setChapterStartTime] = useState('')
  const [addingChapter, setAddingChapter] = useState(false)
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editChapterTitle, setEditChapterTitle] = useState('')
  const [editChapterStartTime, setEditChapterStartTime] = useState('')
  const [savingChapterEdit, setSavingChapterEdit] = useState(false)

  const [collapsedQuizzes, setCollapsedQuizzes] = useState<Record<string, boolean>>({})
  const [editingQuizQuestionId, setEditingQuizQuestionId] = useState<string | null>(null)
  const [editQuizText, setEditQuizText] = useState('')
  const [editQuizOptionA, setEditQuizOptionA] = useState('')
  const [editQuizOptionB, setEditQuizOptionB] = useState('')
  const [editQuizOptionC, setEditQuizOptionC] = useState('')
  const [editQuizOptionD, setEditQuizOptionD] = useState('')
  const [editQuizCorrect, setEditQuizCorrect] = useState<'a'|'b'|'c'|'d'>('a')
  const [editQuizSolution, setEditQuizSolution] = useState('')
  const [savingQuizEdit, setSavingQuizEdit] = useState(false)

  const [activeHomeworkModuleId, setActiveHomeworkModuleId] = useState<string | null>(null)
  const [activeExamModuleId, setActiveExamModuleId] = useState<string | null>(null)
  const [examQuestionMode, setExamQuestionMode] = useState<'image'|'text'>('image')
  const [examImageFile, setExamImageFile] = useState<File | null>(null)
  const [examQuestionText, setExamQuestionText] = useState('')
  const [examOptionA, setExamOptionA] = useState('')
  const [examOptionB, setExamOptionB] = useState('')
  const [examOptionC, setExamOptionC] = useState('')
  const [examOptionD, setExamOptionD] = useState('')
  const [examImageCorrect, setExamImageCorrect] = useState<'a'|'b'|'c'|'d'>('a')
  const [examSolution, setExamSolution] = useState('')
  const [uploadingExamImage, setUploadingExamImage] = useState(false)

  const [collapsedExams, setCollapsedExams] = useState<Record<string, boolean>>({})
  const [editingExamQuestionId, setEditingExamQuestionId] = useState<string | null>(null)
  const [editExamText, setEditExamText] = useState('')
  const [editExamOptionA, setEditExamOptionA] = useState('')
  const [editExamOptionB, setEditExamOptionB] = useState('')
  const [editExamOptionC, setEditExamOptionC] = useState('')
  const [editExamOptionD, setEditExamOptionD] = useState('')
  const [editExamCorrect, setEditExamCorrect] = useState<'a'|'b'|'c'|'d'>('a')
  const [editExamSolution, setEditExamSolution] = useState('')
  const [savingExamEdit, setSavingExamEdit] = useState(false)

  const supabase = useMemo(() => createClient(), [])

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

  const resetChapterForm = () => { setChapterTitle(''); setChapterStartTime(''); setActiveChapterVideoId(null) }

  // Parse "mm:ss" or plain seconds into integer seconds
  const parseTime = (val: string): number => {
    const trimmed = val.trim()
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(Number)
      if (parts.length === 2) return (parts[0] * 60) + parts[1]
      if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
    }
    return parseInt(trimmed) || 0
  }

  const formatTimeForDisplay = (secs: number): string => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${m}:${String(s).padStart(2,'0')}`
  }

  const addChapter = async (videoId: string, existingCount: number) => {
    if (!chapterTitle.trim()) return
    setAddingChapter(true); setError(null)
    try {
      await callApi('addChapter', {
        videoId,
        title: chapterTitle.trim(),
        startTime: parseTime(chapterStartTime),
        orderIndex: existingCount + 1,
      })
      setChapterTitle(''); setChapterStartTime('')
      fetchData()
    } catch (e: any) { setError(e.message) }
    setAddingChapter(false)
  }

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('حذف هذا الفصل؟')) return
    try { await callApi('deleteChapter', { chapterId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  const startEditingChapter = (c: VideoChapter) => {
    setEditingChapterId(c.id)
    setEditChapterTitle(c.title)
    setEditChapterStartTime(formatTimeForDisplay(c.start_time))
  }

  const saveChapterEdit = async () => {
    if (!editingChapterId || !editChapterTitle.trim()) return
    setSavingChapterEdit(true); setError(null)
    try {
      await callApi('updateChapter', {
        chapterId: editingChapterId,
        title: editChapterTitle.trim(),
        startTime: parseTime(editChapterStartTime),
      })
      setEditingChapterId(null); fetchData()
    } catch (e: any) { setError(e.message) }
    setSavingChapterEdit(false)
  }

  const resetVideoForm = () => { setVideoForm({ title: '', video_url: '', duration: '' }); setMuxResult(null); setUploadMode('youtube'); setActiveModuleId(null) }
  const resetFileForm = () => { setSelectedFile(null); setFileName(''); setActiveFileModuleId(null) }
  const resetQuizForm = () => { setQuizTitle(''); setQuizQuestions(Array.from({ length: 10 }, BLANK_QUESTION)); setActiveQuizModuleId(null) }
  const resetExamForm = () => { setExamImageFile(null); setExamQuestionText(''); setExamOptionA(''); setExamOptionB(''); setExamOptionC(''); setExamOptionD(''); setExamImageCorrect('a'); setExamSolution(''); setActiveExamModuleId(null) }
  const resetHomeworkForm = () => { setExamImageFile(null); setExamQuestionText(''); setExamOptionA(''); setExamOptionB(''); setExamOptionC(''); setExamOptionD(''); setExamImageCorrect('a'); setExamSolution(''); setActiveHomeworkModuleId(null) }

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

  const addVideo = async (moduleId: string) => {
    if (!videoForm.title.trim()) return
    if ((uploadMode === 'youtube' || uploadMode === 'url') && !videoForm.video_url.trim()) return
    if (uploadMode === 'upload' && !muxResult) return
    setAddingVideo(true); setError(null)
    try {
      const body: any = { moduleId, title: videoForm.title.trim(), orderIndex: (modules.find(m => m.id === moduleId)?.videos.length || 0) + 1 }
      if (uploadMode === 'youtube' || uploadMode === 'url') {
        body.videoUrl = videoForm.video_url.trim()
        body.duration = videoForm.duration ? parseInt(videoForm.duration) : null
      } else if (muxResult) {
        body.muxAssetId = muxResult.assetId; body.muxPlaybackId = muxResult.playbackId; body.duration = muxResult.duration
      }
      await callApi('addVideo', body); resetVideoForm(); fetchData()
    } catch (e: any) { setError(e.message) }
    setAddingVideo(false)
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Delete this video?')) return
    try { await callApi('deleteVideo', { videoId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

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
    if (!confirm('Delete this quiz and all its questions?')) return
    try { await callApi('deleteQuiz', { quizId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: string) => {
    setQuizQuestions(prev => { const next = [...prev]; (next[idx] as any)[field] = value; return next })
  }

  const startEditingQuizQuestion = (q: QuizQuestion) => {
    setEditingQuizQuestionId(q.id!)
    setEditQuizText(q.question_text)
    setEditQuizOptionA(q.option_a); setEditQuizOptionB(q.option_b)
    setEditQuizOptionC(q.option_c); setEditQuizOptionD(q.option_d)
    setEditQuizCorrect(q.correct)
    setEditQuizSolution(q.solution || '')
  }

  const saveQuizQuestionEdit = async () => {
    if (!editingQuizQuestionId) return
    setSavingQuizEdit(true); setError(null)
    try {
      await callApi('updateQuizQuestion', {
        questionId: editingQuizQuestionId,
        questionText: editQuizText.trim(),
        correct: editQuizCorrect,
        optionA: editQuizOptionA.trim(), optionB: editQuizOptionB.trim(),
        optionC: editQuizOptionC.trim(), optionD: editQuizOptionD.trim(),
        solution: editQuizSolution.trim() || null,
      })
      setEditingQuizQuestionId(null); fetchData()
    } catch (e: any) { setError(e.message) }
    setSavingQuizEdit(false)
  }

  const uploadExamQuestion = async (examId: string, moduleId: string) => {
    if (examQuestionMode === 'image' && !examImageFile) return
    if (examQuestionMode === 'text' && !examQuestionText.trim()) return
    setUploadingExamImage(true); setError(null)
    try {
      const mod = modules.find(m => m.id === moduleId)
      const currentCount = mod?.exam?.exam_question_items.length || 0
      if (examQuestionMode === 'image') {
        const form = new FormData()
        form.append('file', examImageFile!); form.append('examId', examId)
        const res = await fetch(`/api/admin/courses/${courseId}/upload-exam-image`, { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Upload failed')
        await callApi('addExamQuestion', { examId, imageUrl: json.publicUrl, correct: examImageCorrect, orderIndex: currentCount + 1, solution: examSolution.trim() || null })
      } else {
        await callApi('addExamQuestion', { examId, questionText: examQuestionText.trim(), correct: examImageCorrect, orderIndex: currentCount + 1, optionA: examOptionA.trim() || undefined, optionB: examOptionB.trim() || undefined, optionC: examOptionC.trim() || undefined, optionD: examOptionD.trim() || undefined, solution: examSolution.trim() || null })
      }
      setExamImageFile(null); setExamQuestionText(''); setExamOptionA(''); setExamOptionB(''); setExamOptionC(''); setExamOptionD(''); setExamImageCorrect('a'); setExamSolution(''); fetchData()
    } catch (e: any) { setError(e.message) }
    setUploadingExamImage(false)
  }

  const deleteExamQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return
    try { await callApi('deleteExamQuestion', { questionId }); fetchData() }
    catch (e: any) { setError(e.message) }
  }

  const startEditingExamQuestion = (item: ExamQuestionItem) => {
    setEditingExamQuestionId(item.id)
    setEditExamText(item.question_text || '')
    setEditExamOptionA(item.option_a || ''); setEditExamOptionB(item.option_b || '')
    setEditExamOptionC(item.option_c || ''); setEditExamOptionD(item.option_d || '')
    setEditExamCorrect(item.correct)
    setEditExamSolution(item.solution || '')
  }

  const saveExamQuestionEdit = async () => {
    if (!editingExamQuestionId) return
    setSavingExamEdit(true); setError(null)
    try {
      await callApi('updateExamQuestion', {
        questionId: editingExamQuestionId,
        questionText: editExamText.trim(), correct: editExamCorrect,
        optionA: editExamOptionA.trim(), optionB: editExamOptionB.trim(),
        optionC: editExamOptionC.trim(), optionD: editExamOptionD.trim(),
        solution: editExamSolution.trim() || null,
      })
      setEditingExamQuestionId(null); fetchData()
    } catch (e: any) { setError(e.message) }
    setSavingExamEdit(false)
  }

  const youtubePreviewId = uploadMode === 'youtube' ? getYouTubeId(videoForm.video_url) : null

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-theme-secondary text-xl animate-pulse">جاري تحميل المحتوى...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <button suppressHydrationWarning onClick={() => router.push('/admin/courses')} className="text-theme-secondary hover:text-theme-primary flex items-center gap-2 mb-4 transition-colors text-sm">← رجوع للكورسات</button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-1 leading-tight truncate">{course?.title}</h1>
            <p className="text-theme-secondary text-sm">إدارة الوحدات والفيديوهات والملفات والكويزات والإمتحانات</p>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${course?.published ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>{course?.published ? 'منشور' : 'مسودة'}</span>
            <button suppressHydrationWarning onClick={() => router.push(`/admin/courses/${courseId}/edit`)} className="px-3 py-2 bg-[var(--bg-card-alt)] text-theme-primary rounded-lg font-semibold hover:bg-[var(--border-color)] transition-all text-sm whitespace-nowrap">تعديل التفاصيل</button>
          </div>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-red-400 font-semibold">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: 'الوحدات', value: modules.length, color: 'border-primary' },
          { label: 'إجمالي الفيديوهات', value: modules.reduce((a, m) => a + m.videos.length, 0), color: 'border-blue-500' },
          { label: 'كويزات', value: modules.reduce((a, m) => a + (m.quizzes?.length || 0), 0), color: 'border-yellow-500' },
          { label: 'السعر', value: course?.is_free ? 'مجاني' : course?.price_cash != null ? `${course.price_cash} جنيه` : '—', color: 'border-green-500' },
        ].map(s => (
          <div key={s.label} className={`bg-[var(--bg-card)] rounded-lg p-3 md:p-4 border-l-4 ${s.color}`}>
            <p className="text-theme-secondary text-xs md:text-sm">{s.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-theme-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 md:space-y-4 mb-6">
        {modules.length === 0 && <div className="text-center py-12 text-theme-secondary">لا توجد وحدات بعد — أضف وحدة من الأسفل</div>}

        {modules.map((mod, modIndex) => (
          <div key={mod.id} className={`bg-[var(--bg-card)] rounded-xl overflow-hidden border-2 ${mod.module_type === 'exam' ? 'border-yellow-600/50' : mod.module_type === 'homework' ? 'border-green-600/50' : 'border-[var(--border-color)]'}`}>

            {/* Module Header */}
            <div className={`flex flex-col gap-3 px-4 md:px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${mod.module_type === 'exam' ? 'bg-yellow-900/20' : mod.module_type === 'homework' ? 'bg-green-900/20' : 'bg-[var(--bg-card-alt)]'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${mod.module_type === 'exam' ? 'bg-yellow-600' : mod.module_type === 'homework' ? 'bg-green-600' : 'bg-primary'}`}>{modIndex + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[#EFEFEF] font-bold text-base md:text-lg leading-tight truncate">{mod.title}</h3>
                    {mod.module_type === 'exam' && <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/40">EXAM</span>}
                    {mod.module_type === 'homework' && <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs font-bold rounded-full border border-green-600/40">HOMEWORK</span>}
                  </div>
                  <span className="text-[#B3B3B3] text-xs">
                    {mod.module_type === 'exam' ? `${mod.exam?.exam_question_items.length || 0} سؤال` : mod.module_type === 'homework' ? `${mod.exam?.exam_question_items.length || 0} سؤال` : `${mod.videos.length} فيديو, ${mod.quizzes?.length || 0} كويز`}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {mod.module_type === 'lesson' && (<>
                  <button suppressHydrationWarning onClick={() => { if (activeModuleId === mod.id) resetVideoForm(); else { resetVideoForm(); resetFileForm(); resetQuizForm(); resetExamForm(); setActiveModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeModuleId === mod.id ? 'bg-[var(--bg-card-alt)] text-theme-secondary border border-[var(--border-color)]' : 'bg-primary text-white hover:bg-primary/80'}`}>
                    {activeModuleId === mod.id ? '✕ فيديو' : '🎬 إضافة فيديو'}
                  </button>
                  <button suppressHydrationWarning onClick={() => { if (activeFileModuleId === mod.id) resetFileForm(); else { resetFileForm(); resetVideoForm(); resetQuizForm(); resetExamForm(); setActiveFileModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeFileModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-orange-600 text-white hover:bg-orange-500'}`}>
                    {activeFileModuleId === mod.id ? '✕ ملف' : '📎 إضافة ملف'}
                  </button>
                  <button suppressHydrationWarning onClick={() => { if (activeQuizModuleId === mod.id) resetQuizForm(); else { resetQuizForm(); resetVideoForm(); resetFileForm(); resetExamForm(); setActiveQuizModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeQuizModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>
                    {activeQuizModuleId === mod.id ? '✕ كويز' : '📝 إضافة كويز'}
                  </button>
                </>)}
                {mod.module_type === 'homework' && mod.exam && (
                  <button suppressHydrationWarning onClick={() => { if (activeHomeworkModuleId === mod.id) resetHomeworkForm(); else { resetHomeworkForm(); resetExamForm(); setActiveHomeworkModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeHomeworkModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-green-600 text-white hover:bg-green-500'}`}>
                    {activeHomeworkModuleId === mod.id ? '✕ إلغاء' : '➕ إضافة سؤال'}
                  </button>
                )}
                {mod.module_type === 'exam' && mod.exam && (
                  <button suppressHydrationWarning onClick={() => { if (activeExamModuleId === mod.id) resetExamForm(); else { resetExamForm(); resetHomeworkForm(); setActiveExamModuleId(mod.id) } }}
                    className={`flex-1 sm:flex-none px-3 py-2 text-xs md:text-sm font-semibold rounded transition-colors ${activeExamModuleId === mod.id ? 'bg-[#2A2A2A] text-[#B3B3B3] border border-[#555]' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>
                    {activeExamModuleId === mod.id ? '✕ إلغاء' : '➕ إضافة سؤال'}
                  </button>
                )}
                <button suppressHydrationWarning onClick={() => deleteModule(mod.id)} className="px-3 py-2 bg-red-600/30 text-red-400 text-xs md:text-sm font-semibold rounded hover:bg-red-600/50 transition-colors">حذف</button>
              </div>
            </div>

            {/* ── LESSON MODULE ── */}
            {mod.module_type === 'lesson' && (<>
              {mod.videos.length > 0 && (
                <div className="divide-y divide-[var(--border-color)]">
                  {mod.videos.map((video, vi) => {
                    const isYT = video.video_url && getYouTubeId(video.video_url)
                    const showChapters = activeChapterVideoId === video.id
                    return (
                      <div key={video.id}>
                        {/* Video row */}
                        <div className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-[var(--bg-card-alt)] transition-colors gap-2">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <span className="text-primary font-bold text-sm w-5 flex-shrink-0">{vi + 1}.</span>
                            <span className="text-base md:text-lg flex-shrink-0">🎬</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-theme-primary font-semibold text-sm md:text-base truncate">{video.title}</p>
                                {video.mux_playback_id ? <span className="px-2 py-0.5 bg-primary/20 text-theme-secondary text-xs font-bold rounded-full border border-primary/30">MUX</span>
                                  : isYT ? <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-bold rounded-full border border-red-700/40">YouTube</span>
                                  : <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs font-bold rounded-full border border-blue-700/40">URL</span>}
                                {video.chapters.length > 0 && (
                                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs font-bold rounded-full border border-purple-700/40">{video.chapters.length} فصل</span>
                                )}
                              </div>
                              {video.video_url && <p className="text-theme-muted text-xs truncate max-w-[140px] md:max-w-md">{video.video_url}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            {video.duration && <span className="text-theme-secondary text-xs md:text-sm hidden sm:inline">{Math.floor(video.duration / 60)}m {video.duration % 60}s</span>}
                            <button suppressHydrationWarning onClick={() => {
                              if (showChapters) { resetChapterForm() }
                              else { setActiveChapterVideoId(video.id); setChapterTitle(''); setChapterStartTime('') }
                            }} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                              showChapters ? 'bg-purple-900/30 text-purple-400 border border-purple-700/40' : 'bg-purple-900/20 text-purple-400 hover:bg-purple-900/40 border border-purple-700/30'
                            }`}>
                              {showChapters ? '✕ فصول' : '📑 فصول'}
                            </button>
                            <button suppressHydrationWarning onClick={() => deleteVideo(video.id)} className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">حذف</button>
                          </div>
                        </div>

                        {/* Chapters panel */}
                        {showChapters && (
                          <div className="mx-4 md:mx-6 mb-3 rounded-xl border border-purple-700/30 bg-purple-900/10 overflow-hidden">
                            <div className="px-4 py-2.5 bg-purple-900/20 border-b border-purple-700/20 flex items-center justify-between">
                              <p className="text-purple-400 text-xs font-bold uppercase tracking-wider">📑 فصول الفيديو</p>
                              <p className="text-purple-600 text-xs">بتساعد الطلاب يتنقلوا في الفيديو بسهولة</p>
                            </div>

                            {/* Existing chapters */}
                            {video.chapters.length > 0 && (
                              <div className="divide-y divide-purple-700/20">
                                {[...video.chapters].sort((a,b) => a.start_time - b.start_time).map((ch, ci) => (
                                  <div key={ch.id}>
                                    {editingChapterId !== ch.id ? (
                                      <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-900/20 transition-colors">
                                        <span className="text-purple-500 font-mono text-xs w-12 flex-shrink-0 font-bold">{formatTimeForDisplay(ch.start_time)}</span>
                                        <span className="text-[#EFEFEF] text-sm flex-1 truncate">{ch.title}</span>
                                        <div className="flex gap-2 flex-shrink-0">
                                          <button suppressHydrationWarning onClick={() => startEditingChapter(ch)} className="text-purple-400 hover:text-purple-300 text-xs font-semibold">✏️</button>
                                          <button suppressHydrationWarning onClick={() => deleteChapter(ch.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold">حذف</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="px-4 py-3 bg-purple-900/20 flex flex-col sm:flex-row gap-2">
                                        <input type="text" value={editChapterTitle} onChange={e => setEditChapterTitle(e.target.value)}
                                          placeholder="اسم الفصل" className="flex-1 px-3 py-1.5 bg-[#1a1a1a] border border-purple-600/40 focus:border-purple-500 rounded-lg text-[#EFEFEF] outline-none text-sm" />
                                        <input type="text" value={editChapterStartTime} onChange={e => setEditChapterStartTime(e.target.value)}
                                          placeholder="0:00" className="w-24 px-3 py-1.5 bg-[#1a1a1a] border border-purple-600/40 focus:border-purple-500 rounded-lg text-[#EFEFEF] outline-none text-sm font-mono" />
                                        <div className="flex gap-2">
                                          <button suppressHydrationWarning onClick={saveChapterEdit} disabled={savingChapterEdit || !editChapterTitle.trim()}
                                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-500 transition-all disabled:opacity-40">
                                            {savingChapterEdit ? '...' : '✓ حفظ'}
                                          </button>
                                          <button suppressHydrationWarning onClick={() => setEditingChapterId(null)}
                                            className="px-3 py-1.5 bg-[#2A2A2A] text-[#B3B3B3] text-xs font-bold rounded-lg hover:bg-[#3A3A3A]">إلغاء</button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add chapter form */}
                            <div className="px-4 py-3 border-t border-purple-700/20 bg-[#111]">
                              <p className="text-purple-400 text-xs font-bold mb-2">+ فصل جديد</p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
                                  placeholder="مثال: مقدمة الفصل" onKeyDown={e => e.key === 'Enter' && addChapter(video.id, video.chapters.length)}
                                  className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-purple-600/30 focus:border-purple-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                                <input type="text" value={chapterStartTime} onChange={e => setChapterStartTime(e.target.value)}
                                  placeholder="0:00 أو ثواني" onKeyDown={e => e.key === 'Enter' && addChapter(video.id, video.chapters.length)}
                                  className="w-32 px-3 py-2 bg-[#1a1a1a] border border-purple-600/30 focus:border-purple-500 rounded-lg text-[#EFEFEF] outline-none text-sm font-mono placeholder:text-gray-600" />
                                <button suppressHydrationWarning onClick={() => addChapter(video.id, video.chapters.length)}
                                  disabled={addingChapter || !chapterTitle.trim()}
                                  className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-500 transition-all disabled:opacity-40">
                                  {addingChapter ? 'جاري...' : '+ إضافة'}
                                </button>
                              </div>
                              <p className="text-gray-600 text-xs mt-1.5">الوقت: اكتب دقيقة:ثانية (مثل 1:30) أو ثواني (مثل 90)</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {mod.files.length > 0 && (
                <div className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                  {mod.files.map((file, fi) => (
                    <div key={file.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-[var(--bg-card-alt)] transition-colors gap-2">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <span className="text-orange-500 font-bold text-sm w-5 flex-shrink-0">{fi + 1}.</span>
                        <span className="text-lg md:text-xl flex-shrink-0">{fileIcon(file.file_type)}</span>
                        <div className="min-w-0">
                          <p className="text-theme-primary font-semibold text-sm md:text-base truncate">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 text-xs font-bold rounded-full border border-orange-600/30">{file.file_type?.includes('pdf') ? 'PDF' : file.file_type?.includes('word') ? 'DOC' : 'FILE'}</span>
                            {file.file_size && <span className="text-theme-muted text-xs hidden sm:inline">{formatBytes(file.file_size)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-theme-secondary hover:text-theme-primary text-xs md:text-sm transition-colors whitespace-nowrap">معاينة</a>
                        <button suppressHydrationWarning onClick={() => deleteFile(file.id, file.file_url)} className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(mod.quizzes?.length ?? 0) > 0 && (
                <div className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                  {mod.quizzes.map(quiz => (
                    <div key={quiz.id}>
                      <div className="px-4 md:px-6 py-3 bg-[var(--bg-card-alt)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-yellow-400 text-xl flex-shrink-0">📝</span>
                            <div className="min-w-0">
                              <p className="text-theme-primary font-semibold text-sm md:text-base truncate">{quiz.title}</p>
                              <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/30">
                                كويز · {quiz.quiz_questions.length} سؤال
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button suppressHydrationWarning
                              onClick={() => setCollapsedQuizzes(prev => ({ ...prev, [quiz.id]: !prev[quiz.id] }))}
                              className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 text-xs font-semibold rounded-lg hover:bg-yellow-600/30 transition-colors border border-yellow-600/30">
                              {collapsedQuizzes[quiz.id] ? '▶ عرض الأسئلة' : '▼ إخفاء الأسئلة'}
                            </button>
                            <button suppressHydrationWarning onClick={() => deleteQuiz(quiz.id)}
                              className="text-red-400 hover:text-red-300 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap">حذف</button>
                          </div>
                        </div>
                      </div>
                      {!collapsedQuizzes[quiz.id] && quiz.quiz_questions.length > 0 && (
                        <div className="divide-y divide-[var(--border-color)]">
                          {quiz.quiz_questions.map((q, qi) => (
                            <div key={q.id ?? qi}>
                              {editingQuizQuestionId !== q.id ? (
                                <div className="flex items-start gap-3 px-4 md:px-6 py-3 hover:bg-[var(--bg-card)] transition-colors">
                                  <span className="text-yellow-500 font-bold text-sm w-6 flex-shrink-0 pt-0.5">Q{qi + 1}</span>
                                  <div className="flex-1 min-w-0 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] px-3 py-2">
                                    <p className="text-theme-primary text-sm font-semibold mb-2 line-clamp-2">{q.question_text}</p>
                                    <div className="grid grid-cols-2 gap-1">
                                      {(['a','b','c','d'] as const).map(opt => (
                                        <div key={opt} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${q.correct === opt ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-[var(--bg-card-alt)] text-theme-secondary'}`}>
                                          <span className="font-black uppercase">{opt}</span>
                                          <span className="truncate">{(q as any)[`option_${opt}`]}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {q.solution && (
                                      <div className="mt-2 text-xs text-blue-400 bg-blue-900/10 rounded px-2 py-1 border border-blue-500/20 flex items-start gap-1">
                                        <span>💡</span><span className="line-clamp-1">{q.solution}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-black rounded-full border border-green-600/30 uppercase">{q.correct}</span>
                                    <button suppressHydrationWarning onClick={() => startEditingQuizQuestion(q)}
                                      className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors">✏️ تعديل</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-4 md:px-6 py-4 bg-yellow-900/10 border-l-4 border-yellow-500 space-y-3">
                                  <p className="text-yellow-400 text-xs font-bold uppercase">✏️ تعديل سؤال {qi + 1}</p>
                                  <input type="text" value={editQuizText} onChange={e => setEditQuizText(e.target.value)}
                                    placeholder="نص السؤال"
                                    className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-yellow-600/40 focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm" />
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {([
                                      { opt: 'a' as const, val: editQuizOptionA, set: setEditQuizOptionA },
                                      { opt: 'b' as const, val: editQuizOptionB, set: setEditQuizOptionB },
                                      { opt: 'c' as const, val: editQuizOptionC, set: setEditQuizOptionC },
                                      { opt: 'd' as const, val: editQuizOptionD, set: setEditQuizOptionD },
                                    ]).map(({ opt, val, set }) => (
                                      <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${editQuizCorrect === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                                        <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${editQuizCorrect === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                                        <input type="text" value={val} onChange={e => set(e.target.value)}
                                          className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm" />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[#B3B3B3] text-xs font-semibold">الإجابة الصحيحة:</span>
                                    <div className="flex gap-2">
                                      {(['a','b','c','d'] as const).map(opt => (
                                        <button key={opt} suppressHydrationWarning type="button" onClick={() => setEditQuizCorrect(opt)}
                                          className={`w-9 h-9 rounded-full text-xs font-black uppercase transition-all ${editQuizCorrect === opt ? 'bg-green-500 text-white' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <SolutionField value={editQuizSolution} onChange={setEditQuizSolution} />
                                  <div className="flex gap-2">
                                    <button suppressHydrationWarning onClick={saveQuizQuestionEdit}
                                      disabled={savingQuizEdit || !editQuizText.trim()}
                                      className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 transition-all disabled:opacity-40">
                                      {savingQuizEdit ? 'جاري الحفظ...' : '✓ حفظ التعديل'}
                                    </button>
                                    <button suppressHydrationWarning onClick={() => setEditingQuizQuestionId(null)}
                                      className="px-4 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)] transition-all">إلغاء</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {mod.videos.length === 0 && mod.files.length === 0 && (mod.quizzes?.length ?? 0) === 0 && activeModuleId !== mod.id && activeFileModuleId !== mod.id && activeQuizModuleId !== mod.id && (
                <p className="px-4 md:px-6 py-4 text-theme-secondary text-sm italic">لا يوجد محتوى — أضف فيديو أو ملف أو كويز</p>
              )}

              {activeModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[var(--bg-card-alt)] border-t-2" style={{ borderImage: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%) 1' }}>
                  <p className="text-theme-secondary text-sm font-bold uppercase tracking-wider mb-4">🎬 إضافة فيديو جديد</p>
                  <div className="space-y-4">
                    <input type="text" placeholder="عنوان الفيديو *" value={videoForm.title} onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none text-sm placeholder:text-theme-muted" />
                    <div className="flex gap-2">
                      {([{ mode: 'youtube', label: '🎬 YouTube', desc: 'الأوفر والأكثر شيوعاً' }, { mode: 'url', label: '🔗 URL مباشر', desc: 'رابط فيديو مباشر' }, { mode: 'upload', label: '☁️ Mux', desc: 'رفع مباشر' }] as const).map(({ mode, label, desc }) => (
                        <button key={mode} suppressHydrationWarning type="button" onClick={() => { setUploadMode(mode); setMuxResult(null); setVideoForm(p => ({ ...p, video_url: '' })) }}
                          className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-lg transition-all border-2 text-center ${uploadMode === mode ? mode === 'youtube' ? 'bg-red-600 text-white border-red-600' : mode === 'url' ? 'bg-blue-600 text-white border-blue-600' : 'bg-primary text-white border-primary' : 'bg-transparent text-theme-secondary border-[var(--border-color)] hover:border-primary'}`}>
                          <div>{label}</div><div className="text-[10px] opacity-70 font-normal mt-0.5">{desc}</div>
                        </button>
                      ))}
                    </div>
                    {uploadMode === 'youtube' && (
                      <div className="space-y-3">
                        <div className="flex gap-2 items-center p-3 rounded-lg bg-red-900/20 border border-red-700/30">
                          <span className="text-red-400 text-lg">🎬</span>
                          <p className="text-red-300 text-xs">الفيديو هيتشغل بـ بلاير مخصص — مش هيبان لوجو YouTube ولا أي كونترولات</p>
                        </div>
                        <input type="text" placeholder="رابط YouTube — مثال: https://youtube.com/watch?v=xxxxx" value={videoForm.video_url}
                          onChange={e => setVideoForm(p => ({ ...p, video_url: e.target.value }))}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-red-500 rounded-lg text-theme-primary outline-none text-sm placeholder:text-theme-muted" />
                        {youtubePreviewId && (
                          <div className="rounded-xl overflow-hidden border-2 border-red-700/40">
                            <div className="bg-red-900/20 px-3 py-1.5 flex items-center gap-2">
                              <span className="text-red-400 text-xs font-bold">معاينة الفيديو</span>
                              <span className="text-red-600 text-xs font-mono">ID: {youtubePreviewId}</span>
                            </div>
                            <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                              <iframe src={`https://www.youtube.com/embed/${youtubePreviewId}?modestbranding=1&rel=0`} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                          </div>
                        )}
                        {videoForm.video_url && !youtubePreviewId && <p className="text-red-400 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">⚠️ مش قادر يتعرف على ID الفيديو — تأكد إن الرابط صح</p>}
                      </div>
                    )}
                    {uploadMode === 'url' && (
                      <div className="space-y-3">
                        <input type="text" placeholder="رابط فيديو مباشر (.mp4, .m3u8 ...) *" value={videoForm.video_url} onChange={e => setVideoForm(p => ({ ...p, video_url: e.target.value }))}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none text-sm placeholder:text-theme-muted" />
                        <input type="number" placeholder="المدة بالثواني (اختياري)" value={videoForm.duration} onChange={e => setVideoForm(p => ({ ...p, duration: e.target.value }))}
                          className="w-full px-3 py-2 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none text-sm placeholder:text-theme-muted" />
                      </div>
                    )}
                    {uploadMode === 'upload' && <MuxVideoUploader onSuccess={r => setMuxResult(r)} onError={err => setError(err)} />}
                    {/* Thumbnail is set at the course level (course edit page), not per video */}
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => addVideo(mod.id)} disabled={addingVideo} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/80 transition-all disabled:opacity-40">{addingVideo ? 'جاري الحفظ...' : 'حفظ الفيديو'}</button>
                      <button suppressHydrationWarning onClick={resetVideoForm} className="px-5 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)] transition-all">إلغاء</button>
                    </div>
                  </div>
                </div>
              )}

              {activeFileModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-orange-600">
                  <p className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-4">📎 إضافة ملف</p>
                  <div className="space-y-4">
                    <input type="text" placeholder="اسم الملف *" value={fileName} onChange={e => setFileName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-orange-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                    <div className="relative border-2 border-dashed border-[#3A3A3A] hover:border-orange-500 rounded-xl p-8 text-center cursor-pointer transition-colors group" onClick={() => document.getElementById(`file-input-${mod.id}`)?.click()}>
                      <input id={`file-input-${mod.id}`} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); if (!fileName) setFileName(f.name.replace(/\.[^/.]+$/, '')) } }} />
                      {selectedFile
                        ? <div className="flex items-center justify-center gap-3"><span className="text-3xl">{fileIcon(selectedFile.type)}</span><div className="text-left"><p className="text-[#EFEFEF] font-semibold">{selectedFile.name}</p><p className="text-[#B3B3B3] text-xs">{formatBytes(selectedFile.size)}</p></div><button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null) }} className="ml-4 text-red-400 text-sm font-bold">✕</button></div>
                        : <div><p className="text-4xl mb-2">📂</p><p className="text-[#EFEFEF] font-semibold group-hover:text-orange-400">اضغط لاختيار ملف</p><p className="text-[#555] text-xs mt-1">PDF, Word, JPG, PNG</p></div>}
                    </div>
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => uploadFile(mod.id)} disabled={fileUploading || !selectedFile || !fileName.trim()} className="px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-500 transition-all disabled:opacity-40">{fileUploading ? 'جاري الرفع...' : '⬆ رفع ملف'}</button>
                      <button suppressHydrationWarning onClick={resetFileForm} className="px-5 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)]">إلغاء</button>
                    </div>
                  </div>
                </div>
              )}

              {activeQuizModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-yellow-600">
                  <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">📝 إنشاء كويز</p>
                  <div className="space-y-5">
                    <input type="text" placeholder="عنوان الكويز *" value={quizTitle} onChange={e => setQuizTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                    <div className="space-y-6">
                      {quizQuestions.map((q, idx) => (
                        <div key={idx} className="bg-[#2A2A2A] rounded-xl p-4 border border-[#3A3A3A]">
                          <p className="text-yellow-400 text-xs font-bold uppercase mb-3">سؤال {idx + 1}</p>
                          <input type="text" placeholder={`نص السؤال ${idx + 1}`} value={q.question_text} onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#3A3A3A] focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600 mb-3" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {(['a','b','c','d'] as const).map(opt => (
                              <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${q.correct === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#1a1a1a]'}`}>
                                <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${q.correct === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                                <input type="text" placeholder={`خيار ${opt.toUpperCase()}`} value={(q as any)[`option_${opt}`]} onChange={e => updateQuestion(idx, `option_${opt}` as keyof QuizQuestion, e.target.value)}
                                  className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[#B3B3B3] text-xs font-semibold">الإجابة الصحيحة:</span>
                            <div className="flex gap-2">
                              {(['a','b','c','d'] as const).map(opt => (
                                <button key={opt} type="button" suppressHydrationWarning onClick={() => updateQuestion(idx, 'correct', opt)}
                                  className={`w-8 h-8 rounded-full text-xs font-black uppercase transition-all ${q.correct === opt ? 'bg-green-500 text-white' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                          <SolutionField value={q.solution} onChange={v => updateQuestion(idx, 'solution', v)} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => saveQuiz(mod.id)} disabled={savingQuiz} className="px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-40">{savingQuiz ? 'جاري الحفظ...' : '💾 حفظ الكويز'}</button>
                      <button suppressHydrationWarning onClick={resetQuizForm} className="px-5 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)]">إلغاء</button>
                    </div>
                  </div>
                </div>
              )}
            </>)}

            {/* ── HOMEWORK MODULE ── */}
            {mod.module_type === 'homework' && mod.exam && (<>
              {mod.exam.exam_question_items.length > 0 && (
                <button suppressHydrationWarning onClick={() => setCollapsedExams(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                  className="w-full flex items-center justify-between px-4 md:px-6 py-3 bg-green-900/10 hover:bg-green-900/20 transition-colors border-t border-green-600/20">
                  <span className="text-green-400 text-sm font-semibold">{collapsedExams[mod.id] ? '▶ عرض الأسئلة' : '▼ إخفاء الأسئلة'} ({mod.exam.exam_question_items.length})</span>
                  <span className="text-green-600/70 text-xs">{collapsedExams[mod.id] ? 'اضغط للعرض' : 'اضغط للطي'}</span>
                </button>
              )}
              {!collapsedExams[mod.id] && mod.exam.exam_question_items.length > 0 && (
                <div className="divide-y divide-[var(--border-color)]">
                  {mod.exam.exam_question_items.map((item, qi) => (
                    <div key={item.id}>
                      {editingExamQuestionId !== item.id ? (
                        <div className="flex items-start gap-3 px-4 md:px-6 py-3 hover:bg-[var(--bg-card-alt)] transition-colors">
                          <span className="text-green-500 font-bold text-sm w-6 flex-shrink-0 pt-1">Q{qi + 1}</span>
                          {item.image_url ? (
                            <div className="relative w-28 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-input)]" style={{ minHeight: 72 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.image_url} alt={`Q${qi + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] px-3 py-2">
                              <p className="text-theme-primary text-sm font-semibold line-clamp-2">{item.question_text}</p>
                              {(item.option_a || item.option_b || item.option_c || item.option_d) && (
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                  {(['a','b','c','d'] as const).map(opt => {
                                    const val = item[`option_${opt}` as keyof ExamQuestionItem] as string | null
                                    if (!val) return null
                                    return (
                                      <div key={opt} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${item.correct === opt ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-[var(--bg-card-alt)] text-theme-secondary'}`}>
                                        <span className="font-black uppercase">{opt}</span><span className="truncate">{val}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {item.solution && (
                                <div className="mt-2 text-xs text-blue-400 bg-blue-900/10 rounded px-2 py-1 border border-blue-500/20 flex items-start gap-1">
                                  <span>💡</span><span className="line-clamp-1">{item.solution}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end pt-1">
                            <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-black rounded-full border border-green-600/30 uppercase">{item.correct}</span>
                            {!item.image_url && (
                              <button suppressHydrationWarning onClick={() => startEditingExamQuestion(item)} className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors">✏️ تعديل</button>
                            )}
                            <button suppressHydrationWarning onClick={() => deleteExamQuestion(item.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">حذف</button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 md:px-6 py-4 bg-green-900/10 border-l-4 border-green-500 space-y-3">
                          <p className="text-green-400 text-xs font-bold uppercase">✏️ تعديل سؤال {qi + 1}</p>
                          <textarea value={editExamText} onChange={e => setEditExamText(e.target.value)} rows={3}
                            className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-green-600/40 focus:border-green-500 rounded-lg text-[#EFEFEF] outline-none text-sm resize-none" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([{ opt: 'a' as const, val: editExamOptionA, set: setEditExamOptionA }, { opt: 'b' as const, val: editExamOptionB, set: setEditExamOptionB }, { opt: 'c' as const, val: editExamOptionC, set: setEditExamOptionC }, { opt: 'd' as const, val: editExamOptionD, set: setEditExamOptionD }]).map(({ opt, val, set }) => (
                              <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${editExamCorrect === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                                <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${editExamCorrect === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                                <input type="text" value={val} onChange={e => set(e.target.value)} className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#B3B3B3] text-xs font-semibold">الإجابة الصحيحة:</span>
                            <div className="flex gap-2">
                              {(['a','b','c','d'] as const).map(opt => (
                                <button key={opt} suppressHydrationWarning type="button" onClick={() => setEditExamCorrect(opt)}
                                  className={`w-9 h-9 rounded-full text-xs font-black uppercase transition-all ${editExamCorrect === opt ? 'bg-green-500 text-white' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                          <SolutionField value={editExamSolution} onChange={setEditExamSolution} />
                          <div className="flex gap-2">
                            <button suppressHydrationWarning onClick={saveExamQuestionEdit} disabled={savingExamEdit || !editExamText.trim()}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 transition-all disabled:opacity-40">{savingExamEdit ? 'جاري الحفظ...' : '✓ حفظ التعديل'}</button>
                            <button suppressHydrationWarning onClick={() => setEditingExamQuestionId(null)} className="px-4 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)] transition-all">إلغاء</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {mod.exam.exam_question_items.length === 0 && activeHomeworkModuleId !== mod.id && (
                <p className="px-4 md:px-6 py-4 text-theme-secondary text-sm italic">لا توجد أسئلة — اضغط "إضافة سؤال" لبدء</p>
              )}
              {activeHomeworkModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-green-600">
                  <p className="text-green-400 text-sm font-bold uppercase tracking-wider mb-4">➕ إضافة سؤال جديد</p>
                  <div className="flex gap-2 mb-4">
                    {(['image', 'text'] as const).map(mode => (
                      <button key={mode} suppressHydrationWarning type="button" onClick={() => { setExamQuestionMode(mode); setExamImageFile(null); setExamQuestionText('') }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${examQuestionMode === mode ? 'bg-green-600 text-white border-green-600' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-green-600'}`}>
                        {mode === 'image' ? '🖼️ سؤال بصورة' : '📝 سؤال بنص'}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {examQuestionMode === 'image' ? (
                      <div className="relative border-2 border-dashed border-[#3A3A3A] hover:border-green-500 rounded-xl p-6 text-center cursor-pointer transition-colors group" onClick={() => document.getElementById(`hw-img-${mod.id}`)?.click()}>
                        <input id={`hw-img-${mod.id}`} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setExamImageFile(f) }} />
                        {examImageFile
                          ? <div className="flex items-center justify-center gap-3"><span className="text-3xl">🖼️</span><div className="text-left"><p className="text-[#EFEFEF] font-semibold">{examImageFile.name}</p></div><button type="button" onClick={e => { e.stopPropagation(); setExamImageFile(null) }} className="ml-4 text-red-400 text-sm font-bold">✕</button></div>
                          : <div><p className="text-4xl mb-2">📸</p><p className="text-[#EFEFEF] font-semibold group-hover:text-green-400">اضغط لرفع صورة السؤال</p><p className="text-[#555] text-xs mt-1">PNG, JPG, WEBP</p></div>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea placeholder="اكتب نص السؤال هنا..." value={examQuestionText} onChange={e => setExamQuestionText(e.target.value)} rows={3}
                          className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-green-500 rounded-xl text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600 resize-none leading-relaxed" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {([{ opt: 'a' as const, val: examOptionA, set: setExamOptionA }, { opt: 'b' as const, val: examOptionB, set: setExamOptionB }, { opt: 'c' as const, val: examOptionC, set: setExamOptionC }, { opt: 'd' as const, val: examOptionD, set: setExamOptionD }]).map(({ opt, val, set }) => (
                            <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${examImageCorrect === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                              <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${examImageCorrect === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                              <input type="text" placeholder={`خيار ${opt.toUpperCase()}`} value={val} onChange={e => set(e.target.value)} className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-[#B3B3B3] text-sm font-semibold">الإجابة الصحيحة:</span>
                      <div className="flex gap-2">
                        {(['a','b','c','d'] as const).map(opt => (
                          <button key={opt} suppressHydrationWarning type="button" onClick={() => setExamImageCorrect(opt)}
                            className={`w-12 h-12 rounded-xl text-sm font-black uppercase transition-all ${examImageCorrect === opt ? 'bg-green-500 text-white scale-110' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <SolutionField value={examSolution} onChange={setExamSolution} />
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => uploadExamQuestion(mod.exam!.id, mod.id)}
                        disabled={uploadingExamImage || (examQuestionMode === 'image' ? !examImageFile : !examQuestionText.trim())}
                        className="px-5 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 transition-all disabled:opacity-40">
                        {uploadingExamImage ? 'جاري الحفظ...' : '➕ إضافة سؤال'}
                      </button>
                      <button suppressHydrationWarning onClick={resetHomeworkForm} className="px-5 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)]">إلغاء</button>
                    </div>
                  </div>
                </div>
              )}
            </>)}

            {/* ── EXAM MODULE ── */}
            {mod.module_type === 'exam' && mod.exam && (<>
              {mod.exam.exam_question_items.length > 0 && (
                <button suppressHydrationWarning onClick={() => setCollapsedExams(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                  className="w-full flex items-center justify-between px-4 md:px-6 py-3 bg-yellow-900/10 hover:bg-yellow-900/20 transition-colors border-t border-yellow-600/20">
                  <span className="text-yellow-400 text-sm font-semibold">{collapsedExams[mod.id] ? '▶ عرض الأسئلة' : '▼ إخفاء الأسئلة'} ({mod.exam.exam_question_items.length})</span>
                  <span className="text-yellow-600/70 text-xs">{collapsedExams[mod.id] ? 'اضغط للعرض' : 'اضغط للطي'}</span>
                </button>
              )}
              {!collapsedExams[mod.id] && mod.exam.exam_question_items.length > 0 && (
                <div className="divide-y divide-[var(--border-color)]">
                  {mod.exam.exam_question_items.map((item, qi) => (
                    <div key={item.id}>
                      {editingExamQuestionId !== item.id ? (
                        <div className="flex items-start gap-3 px-4 md:px-6 py-3 hover:bg-[var(--bg-card-alt)] transition-colors">
                          <span className="text-yellow-500 font-bold text-sm w-6 flex-shrink-0 pt-1">Q{qi + 1}</span>
                          {item.image_url ? (
                            <div className="relative w-28 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-input)]" style={{ minHeight: 72 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.image_url} alt={`Q${qi + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)] px-3 py-2">
                              <p className="text-theme-primary text-sm font-semibold line-clamp-2">{item.question_text}</p>
                              {(item.option_a || item.option_b || item.option_c || item.option_d) && (
                                <div className="grid grid-cols-2 gap-1 mt-2">
                                  {(['a','b','c','d'] as const).map(opt => {
                                    const val = item[`option_${opt}` as keyof ExamQuestionItem] as string | null
                                    if (!val) return null
                                    return (
                                      <div key={opt} className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${item.correct === opt ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-[var(--bg-card-alt)] text-theme-secondary'}`}>
                                        <span className="font-black uppercase">{opt}</span><span className="truncate">{val}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {item.solution && (
                                <div className="mt-2 text-xs text-blue-400 bg-blue-900/10 rounded px-2 py-1 border border-blue-500/20 flex items-start gap-1">
                                  <span>💡</span><span className="line-clamp-1">{item.solution}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end pt-1">
                            <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-black rounded-full border border-green-600/30 uppercase">{item.correct}</span>
                            {item.image_url && <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="text-theme-secondary hover:text-theme-primary text-xs transition-colors">عرض</a>}
                            {!item.image_url && (
                              <button suppressHydrationWarning onClick={() => startEditingExamQuestion(item)} className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors">✏️ تعديل</button>
                            )}
                            <button suppressHydrationWarning onClick={() => deleteExamQuestion(item.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors">حذف</button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 md:px-6 py-4 bg-yellow-900/10 border-l-4 border-yellow-500 space-y-3">
                          <p className="text-yellow-400 text-xs font-bold uppercase">✏️ تعديل سؤال {qi + 1}</p>
                          <textarea value={editExamText} onChange={e => setEditExamText(e.target.value)} rows={3}
                            className="w-full px-3 py-2 bg-[#2A2A2A] border-2 border-yellow-600/40 focus:border-yellow-500 rounded-lg text-[#EFEFEF] outline-none text-sm resize-none" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([{ opt: 'a' as const, val: editExamOptionA, set: setEditExamOptionA }, { opt: 'b' as const, val: editExamOptionB, set: setEditExamOptionB }, { opt: 'c' as const, val: editExamOptionC, set: setEditExamOptionC }, { opt: 'd' as const, val: editExamOptionD, set: setEditExamOptionD }]).map(({ opt, val, set }) => (
                              <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${editExamCorrect === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                                <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${editExamCorrect === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                                <input type="text" value={val} onChange={e => set(e.target.value)} className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm" />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#B3B3B3] text-xs font-semibold">الإجابة الصحيحة:</span>
                            <div className="flex gap-2">
                              {(['a','b','c','d'] as const).map(opt => (
                                <button key={opt} suppressHydrationWarning type="button" onClick={() => setEditExamCorrect(opt)}
                                  className={`w-9 h-9 rounded-full text-xs font-black uppercase transition-all ${editExamCorrect === opt ? 'bg-green-500 text-white' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                          <SolutionField value={editExamSolution} onChange={setEditExamSolution} />
                          <div className="flex gap-2">
                            <button suppressHydrationWarning onClick={saveExamQuestionEdit} disabled={savingExamEdit || !editExamText.trim()}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 transition-all disabled:opacity-40">{savingExamEdit ? 'جاري الحفظ...' : '✓ حفظ التعديل'}</button>
                            <button suppressHydrationWarning onClick={() => setEditingExamQuestionId(null)} className="px-4 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)] transition-all">إلغاء</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {mod.exam.exam_question_items.length === 0 && activeExamModuleId !== mod.id && (
                <p className="px-4 md:px-6 py-4 text-theme-secondary text-sm italic">لا توجد أسئلة — اضغط "إضافة سؤال" لبدء</p>
              )}
              {activeExamModuleId === mod.id && (
                <div className="px-4 md:px-6 py-5 bg-[#1a1a1a] border-t-2 border-yellow-600">
                  <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider mb-4">➕ إضافة سؤال جديد</p>
                  <div className="flex gap-2 mb-4">
                    {(['image', 'text'] as const).map(mode => (
                      <button key={mode} suppressHydrationWarning type="button" onClick={() => { setExamQuestionMode(mode); setExamImageFile(null); setExamQuestionText('') }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${examQuestionMode === mode ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-yellow-600'}`}>
                        {mode === 'image' ? '🖼️ سؤال بصورة' : '📝 سؤال بنص'}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {examQuestionMode === 'image' ? (
                      <div className="relative border-2 border-dashed border-[#3A3A3A] hover:border-yellow-500 rounded-xl p-6 text-center cursor-pointer transition-colors group" onClick={() => document.getElementById(`exam-img-${mod.id}`)?.click()}>
                        <input id={`exam-img-${mod.id}`} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setExamImageFile(f) }} />
                        {examImageFile
                          ? <div className="flex items-center justify-center gap-3"><span className="text-3xl">🖼️</span><div className="text-left"><p className="text-[#EFEFEF] font-semibold">{examImageFile.name}</p><p className="text-[#B3B3B3] text-xs">{formatBytes(examImageFile.size)}</p></div><button type="button" onClick={e => { e.stopPropagation(); setExamImageFile(null) }} className="ml-4 text-red-400 text-sm font-bold">✕</button></div>
                          : <div><p className="text-4xl mb-2">📸</p><p className="text-[#EFEFEF] font-semibold group-hover:text-yellow-400">اضغط لرفع صورة السؤال</p><p className="text-[#555] text-xs mt-1">PNG, JPG, WEBP</p></div>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea placeholder="اكتب نص السؤال هنا..." value={examQuestionText} onChange={e => setExamQuestionText(e.target.value)} rows={3}
                          className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-yellow-500 rounded-xl text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600 resize-none leading-relaxed" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {([{ opt: 'a' as const, val: examOptionA, set: setExamOptionA }, { opt: 'b' as const, val: examOptionB, set: setExamOptionB }, { opt: 'c' as const, val: examOptionC, set: setExamOptionC }, { opt: 'd' as const, val: examOptionD, set: setExamOptionD }]).map(({ opt, val, set }) => (
                            <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${examImageCorrect === opt ? 'border-green-500 bg-green-500/10' : 'border-[#3A3A3A] bg-[#2A2A2A]'}`}>
                              <span className={`text-xs font-black uppercase w-5 flex-shrink-0 ${examImageCorrect === opt ? 'text-green-400' : 'text-[#B3B3B3]'}`}>{opt}</span>
                              <input type="text" placeholder={`خيار ${opt.toUpperCase()}`} value={val} onChange={e => set(e.target.value)} className="flex-1 bg-transparent text-[#EFEFEF] outline-none text-sm placeholder:text-gray-600" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-[#B3B3B3] text-sm font-semibold">الإجابة الصحيحة:</span>
                      <div className="flex gap-2">
                        {(['a','b','c','d'] as const).map(opt => (
                          <button key={opt} suppressHydrationWarning type="button" onClick={() => setExamImageCorrect(opt)}
                            className={`w-12 h-12 rounded-xl text-sm font-black uppercase transition-all ${examImageCorrect === opt ? 'bg-green-500 text-white scale-110' : 'bg-[#3A3A3A] text-[#B3B3B3] hover:bg-[#4A4A4A]'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <SolutionField value={examSolution} onChange={setExamSolution} />
                    <div className="flex gap-2">
                      <button suppressHydrationWarning onClick={() => uploadExamQuestion(mod.exam!.id, mod.id)}
                        disabled={uploadingExamImage || (examQuestionMode === 'image' ? !examImageFile : !examQuestionText.trim())}
                        className="px-5 py-2 bg-yellow-600 text-white text-sm font-bold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-40">
                        {uploadingExamImage ? 'جاري الحفظ...' : '➕ إضافة سؤال'}
                      </button>
                      <button suppressHydrationWarning onClick={resetExamForm} className="px-5 py-2 bg-[var(--bg-card-alt)] text-theme-primary text-sm font-bold rounded-lg hover:bg-[var(--border-color)]">إلغاء</button>
                    </div>
                  </div>
                </div>
              )}
            </>)}
          </div>
        ))}
      </div>

      {/* Add Module */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 md:p-6 border-2 border-dashed border-[var(--border-color)] hover:border-primary transition-colors">
        <p className="text-theme-secondary text-sm font-bold uppercase tracking-wider mb-3">إضافة وحدة جديدة</p>
        <div className="flex gap-2 mb-4">
          <button suppressHydrationWarning type="button" onClick={() => setNewModuleType('lesson')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${newModuleType === 'lesson' ? 'bg-primary text-white border-primary' : 'bg-transparent text-theme-secondary border-[var(--border-color)] hover:border-primary'}`}>📚 وحدة درس</button>
          <button suppressHydrationWarning type="button" onClick={() => setNewModuleType('exam')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${newModuleType === 'exam' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-yellow-600'}`}>📋 وحدة امتحان</button>
          <button suppressHydrationWarning type="button" onClick={() => setNewModuleType('homework')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all border-2 ${newModuleType === 'homework' ? 'bg-green-600 text-white border-green-600' : 'bg-transparent text-[#B3B3B3] border-[#3A3A3A] hover:border-green-600'}`}>📝 وحدة واجب</button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input type="text" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addModule()}
            placeholder={newModuleType === 'exam' ? 'عنوان الامتحان، مثل: امتحان نهائي' : newModuleType === 'homework' ? 'عنوان الواجب، مثل: واجب الفصل 1' : 'عنوان الوحدة، مثل: الفصل 1: مقدمة'}
            className="flex-1 px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-lg text-theme-primary outline-none transition-colors placeholder:text-theme-muted text-sm" />
          <button suppressHydrationWarning onClick={addModule} disabled={addingModule || !newModuleTitle.trim()}
            className={`w-full sm:w-auto px-6 py-3 text-white font-bold rounded-lg transition-all disabled:opacity-50 whitespace-nowrap ${newModuleType === 'exam' ? 'bg-yellow-600 hover:bg-yellow-500' : newModuleType === 'homework' ? 'bg-green-600 hover:bg-green-500' : 'bg-primary hover:bg-primary/80'}`}>
            {addingModule ? 'جاري الإضافة...' : `+ إضافة ${newModuleType === 'exam' ? 'امتحان' : newModuleType === 'homework' ? 'واجب' : 'وحدة'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
