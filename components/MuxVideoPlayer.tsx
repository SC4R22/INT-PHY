'use client'

import MuxPlayer from '@mux/mux-player-react'
import { useRef, useCallback } from 'react'

interface Props {
  playbackId: string
  title: string
  startTime?: number
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  onPause?: (currentTime: number) => void
}

export function MuxVideoPlayer({
  playbackId,
  title,
  startTime = 0,
  onTimeUpdate,
  onEnded,
  onPause,
}: Props) {
  const playerRef = useRef<any>(null)

  const handleTimeUpdate = useCallback(() => {
    const currentTime = playerRef.current?.currentTime ?? 0
    onTimeUpdate?.(currentTime)
  }, [onTimeUpdate])

  const handlePause = useCallback(() => {
    const currentTime = playerRef.current?.currentTime ?? 0
    onPause?.(currentTime)
  }, [onPause])

  return (
    <MuxPlayer
      ref={playerRef}
      playbackId={playbackId}
      envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY}
      title={title}
      startTime={startTime}
      accentColor="#6A0DAD"
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        display: 'block',
        '--controls': 'auto',
      } as any}
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnded}
      onPause={handlePause}
    />
  )
}
