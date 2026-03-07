'use client'

import { useState } from 'react'

export default function ProfileImage() {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card)]">
        <span className="text-6xl">👨‍🏫</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/profile.jpg"
      alt="أحمد بدوي"
      className="w-full h-full object-cover object-top"
      onError={() => setError(true)}
    />
  )
}
