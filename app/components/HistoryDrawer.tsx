'use client'

import { useEffect, useState } from 'react'

export type HistoryEntry = {
  id: string
  question: string
  response: string
  ts: number
}

const STORAGE_KEY = 'handydad-history'
const MAX_ENTRIES = 50

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setEntries(JSON.parse(raw))
    } catch {
      // ignore corrupt history
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // ignore quota errors
    }
  }, [entries, hydrated])

  const add = (entry: Omit<HistoryEntry, 'id' | 'ts'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
      ts: Date.now(),
    }
    setEntries(prev => [newEntry, ...prev].slice(0, MAX_ENTRIES))
  }

  const remove = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const clear = () => setEntries([])

  return { entries, add, remove, clear }
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ts).toLocaleDateString()
}

type Props = {
  open: boolean
  onClose: () => void
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function HistoryDrawer({ open, onClose, entries, onSelect, onRemove, onClear }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`history-drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-label="Question history"
        aria-hidden={!open}
      >
        <div className="drawer-header">
          <span className="card-section">§ Log / History</span>
          <span className="card-rule" aria-hidden="true" />
          <button
            className="btn-dismiss drawer-close"
            onClick={onClose}
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        <div className="drawer-meta">
          <span className="drawer-count">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
          {entries.length > 0 && (
            <button className="btn-link drawer-clear" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>

        <div className="drawer-list">
          {entries.length === 0 ? (
            <div className="drawer-empty">
              <div className="drawer-empty-mark">∅</div>
              <p>No questions yet.</p>
              <p className="drawer-empty-hint">
                Anything you ask will be logged here automatically.
              </p>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <button
                key={entry.id}
                className="history-entry"
                onClick={() => { onSelect(entry); onClose() }}
              >
                <span className="history-entry-num">
                  №{String(entries.length - idx).padStart(3, '0')}
                </span>
                <span className="history-entry-body">
                  <span className="history-entry-q">{entry.question}</span>
                  <span className="history-entry-time">{formatRelative(entry.ts)}</span>
                </span>
                <span
                  className="history-entry-x"
                  role="button"
                  tabIndex={0}
                  aria-label="Delete entry"
                  onClick={(e) => { e.stopPropagation(); onRemove(entry.id) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation(); e.preventDefault(); onRemove(entry.id)
                    }
                  }}
                >
                  ✕
                </span>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
