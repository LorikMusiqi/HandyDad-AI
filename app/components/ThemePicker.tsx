'use client'

import { useEffect, useRef, useState } from 'react'
import { applyTheme, DEFAULT_THEME, loadTheme, saveTheme, THEMES, ThemeId } from '../lib/themes'

export function ThemePicker() {
  const [active, setActive] = useState<ThemeId>(DEFAULT_THEME)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActive(loadTheme())
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const select = (id: ThemeId) => {
    setActive(id)
    applyTheme(id)
    saveTheme(id)
    setOpen(false)
  }

  return (
    <div className="theme-picker" ref={ref}>
      <button className="theme-btn" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="theme-swatch" />
        {THEMES[active].label}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="theme-dropdown" role="listbox">
          {(Object.keys(THEMES) as ThemeId[]).map(id => (
            <div
              key={id}
              role="option"
              aria-selected={id === active}
              className={`theme-option ${id === active ? 'active' : ''}`}
              onClick={() => select(id)}
            >
              <span className="theme-dot" style={{ background: THEMES[id].swatch }} />
              {THEMES[id].label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
