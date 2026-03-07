'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Video {
  id: string
  title: string
  duration?: number
  order_index?: number
}

interface Module {
  id: string
  title: string
  order_index?: number
  videos?: Video[]
}

interface Props {
  modules: Module[]
  videoId: string
  progressMap: Record<string, { video_id: string; completed: boolean; last_position: number }>
  lockedIds: string[]
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function CollapsibleModuleList({ modules, videoId, progressMap, lockedIds }: Props) {
  const lockedSet = new Set(lockedIds)

  // Find which module contains the active video — open it by default
  const activeModuleId = modules.find((m) =>
    m.videos?.some((v) => v.id === videoId)
  )?.id

  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(activeModuleId ? [activeModuleId] : [])
  )

  const toggle = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="divide-y divide-[var(--border-color)]">
      {modules.map((mod, modIndex) => {
        const sortedVideos = [...(mod.videos ?? [])].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        )
        const isOpen = openModules.has(mod.id)
        const completedCount = sortedVideos.filter((v) => progressMap[v.id]?.completed).length
        const isActiveModule = mod.id === activeModuleId

        return (
          <div key={mod.id}>
            {/* ── Module header (clickable) ── */}
            <button
              onClick={() => toggle(mod.id)}
              className={`w-full flex items-center gap-3 px-4 py-4 text-right transition-colors
                ${isActiveModule
                  ? 'bg-primary/10 hover:bg-primary/15'
                  : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)]'
                }`}
            >
              {/* Orange gradient arrow button matching mockup */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                style={{ background: 'linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)' }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </div>

              {/* Module title + progress */}
              <div className="flex-1 min-w-0 text-right">
                <p className={`font-bold text-sm truncate ${isActiveModule ? 'text-primary' : 'text-theme-primary'}`}>
                  الجزء {modIndex + 1}: {mod.title}
                </p>
                <p className="text-theme-secondary text-xs mt-0.5">
                  {completedCount} / {sortedVideos.length} مكتمل
                </p>
              </div>
            </button>

            {/* ── Videos list (collapsible) ── */}
            {isOpen && (
              <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
                {sortedVideos.map((v, vIdx) => {
                  const prog = progressMap[v.id]
                  const isActive = v.id === videoId
                  const isDone = prog?.completed ?? false
                  const isLocked = lockedSet.has(v.id)

                  if (isLocked) {
                    return (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 px-5 py-3 opacity-40 cursor-not-allowed"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--bg-card-alt)] text-xs">
                          🔒
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <p className="text-xs font-semibold truncate text-theme-muted">
                            {vIdx + 1}. {v.title}
                          </p>
                          {v.duration && (
                            <p className="text-[10px] text-theme-muted mt-0.5">{formatDuration(v.duration)}</p>
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={v.id}
                      href={`/dashboard/watch/${v.id}`}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors border-r-4 ${
                        isActive
                          ? 'bg-primary/15 border-primary'
                          : 'hover:bg-[var(--bg-card-alt)] border-transparent'
                      }`}
                    >
                      {/* Status circle */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        isDone
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-[var(--text-muted)] text-[var(--text-muted)]'
                      }`}>
                        {isDone ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </div>

                      {/* Title + duration */}
                      <div className="min-w-0 flex-1 text-right">
                        <p className={`text-xs font-semibold truncate ${
                          isActive ? 'text-primary' : isDone ? 'text-theme-secondary' : 'text-theme-primary'
                        }`}>
                          {vIdx + 1}. {v.title}
                        </p>
                        {v.duration && (
                          <p className="text-[10px] text-theme-muted mt-0.5">{formatDuration(v.duration)}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
