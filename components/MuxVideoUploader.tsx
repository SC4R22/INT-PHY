'use client'

import { useState, useRef, useCallback } from 'react'

interface MuxUploadResult {
  assetId: string
  playbackId: string
  duration: number | null
}

interface Props {
  onSuccess: (result: MuxUploadResult) => void
  onError?: (err: string) => void
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error'

export function MuxVideoUploader({ onSuccess, onError }: Props) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('uploading')
    setProgress(0)
    setError(null)

    try {
      // Step 1 — get a direct upload URL from our API
      const res = await fetch('/api/videos/upload', { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to get upload URL')
      }
      const { uploadUrl, uploadId } = await res.json()

      // Step 2 — PUT the file directly to Mux (not through our server)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/*')
        xhr.send(file)
      })

      // Step 3 — poll until Mux finishes processing
      setStatus('processing')
      await pollUntilReady(uploadId)

    } catch (err: any) {
      const msg = err.message || 'Upload failed'
      setError(msg)
      setStatus('error')
      onError?.(msg)
    }
  }, [onSuccess, onError])

  async function pollUntilReady(uploadId: string, attempt = 0): Promise<void> {
    // Give up after ~10 minutes (60 attempts × 10s)
    if (attempt > 60) {
      throw new Error('Mux processing timed out. The video may still be processing — try refreshing.')
    }

    await new Promise(r => setTimeout(r, attempt === 0 ? 3000 : 10_000))

    const res = await fetch(`/api/videos/status?uploadId=${uploadId}`)
    if (!res.ok) throw new Error('Failed to check processing status')

    const data = await res.json()

    if (data.status === 'errored') {
      throw new Error('Mux failed to process this video. Please try a different file.')
    }

    if (data.ready && data.playbackId) {
      setStatus('ready')
      onSuccess({
        assetId: data.assetId,
        playbackId: data.playbackId,
        duration: data.duration,
      })
      return
    }

    // Not ready yet — keep polling
    return pollUntilReady(uploadId, attempt + 1)
  }

  const reset = () => {
    xhrRef.current?.abort()
    setStatus('idle')
    setProgress(0)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={status === 'uploading' || status === 'processing'}
        className="hidden"
      />

      {/* IDLE — show drop zone */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-8 border-2 border-dashed border-[#6A0DAD] rounded-xl text-[#B3B3B3] hover:text-[#EFEFEF] hover:border-[#8B2CAD] hover:bg-[#6A0DAD]/5 transition-all flex flex-col items-center gap-2"
        >
          <span className="text-4xl">🎬</span>
          <span className="font-bold text-sm">Click to select video file</span>
          <span className="text-xs opacity-60">MP4, MOV, MKV, AVI — any size</span>
        </button>
      )}

      {/* UPLOADING — progress bar */}
      {status === 'uploading' && (
        <div className="space-y-3 p-4 bg-[#1a1a1a] rounded-xl border-2 border-[#3A3A3A]">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#B3B3B3] font-semibold">Uploading to Mux...</span>
            <span className="text-[#6A0DAD] font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#6A0DAD] to-[#8B2CAD] h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[#555]">Do not close this tab while uploading</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* PROCESSING — waiting for Mux to transcode */}
      {status === 'processing' && (
        <div className="flex items-start gap-4 p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
          <span className="text-2xl animate-spin flex-shrink-0 mt-0.5">⚙️</span>
          <div>
            <p className="text-yellow-400 font-bold text-sm">Processing video...</p>
            <p className="text-[#B3B3B3] text-xs mt-1">
              Mux is transcoding your video. This usually takes 1–3 minutes depending on file size.
            </p>
            <p className="text-[#555] text-xs mt-1">You can leave this tab open — we&apos;ll update automatically.</p>
          </div>
        </div>
      )}

      {/* READY — success */}
      {status === 'ready' && (
        <div className="flex items-center justify-between p-4 bg-green-500/10 border-2 border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-green-400 font-bold text-sm">Video ready!</p>
              <p className="text-[#B3B3B3] text-xs">Processed and ready for students</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors underline"
          >
            Replace
          </button>
        </div>
      )}

      {/* ERROR */}
      {status === 'error' && (
        <div className="flex items-start justify-between gap-3 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl">
          <div>
            <p className="text-red-400 font-bold text-sm">Upload failed</p>
            <p className="text-[#B3B3B3] text-xs mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#B3B3B3] hover:text-[#EFEFEF] transition-colors underline flex-shrink-0"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
