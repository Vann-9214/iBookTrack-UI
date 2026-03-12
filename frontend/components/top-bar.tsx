'use client'

import { useState } from 'react'
import { Bell, Search } from 'lucide-react'
import Image from 'next/image'

export function TopBar() {
  const [query, setQuery] = useState('')

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Avatar */}
        <button
          aria-label="Account"
          className="h-9 w-9 overflow-hidden rounded-full border border-border bg-muted transition hover:ring-2 hover:ring-primary/40"
        >
          <Image
            src="/images/avatar-placeholder.png"
            alt="Profile"
            width={36}
            height={36}
            className="h-full w-full object-cover"
            onError={(e) => {
              // fallback to initials box if image is missing
              const t = e.currentTarget as HTMLImageElement
              t.style.display = 'none'
              const parent = t.parentElement
              if (parent && !parent.querySelector('span')) {
                const span = document.createElement('span')
                span.className = 'flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs font-bold'
                span.textContent = 'U'
                parent.appendChild(span)
              }
            }}
          />
        </button>
      </div>
    </header>
  )
}
