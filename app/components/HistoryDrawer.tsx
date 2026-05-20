'use client'

import { useEffect, useState } from 'react'
import type { ChatMessage, HistoryThread } from '../lib/types'

export type { HistoryThread }

const STORAGE_KEY = 'handydad-history-v2'
const LEGACY_STORAGE_KEY = 'handydad-history'
const MAX_ENTRIES = 50

function isValidMessage(m: any): m is ChatMessage {
  return (
    m &&
    typeof m === 'object' &&
    typeof m.id === 'string' &&
    typeof m.content === 'string' &&
    (m.role === 'user' || m.role === 'assistant' || m.role === 'error')
  )
}

function isValidThread(t: any): t is HistoryThread {
  return (
    t &&
    typeof t === 'object' &&
    typeof t.id === 'string' &&
    typeof t.ts === 'number' &&
    Array.isArray(t.messages) &&
    t.messages.every(isValidMessage)
  )
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryThread[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setEntries(parsed.filter(isValidThread))
      }
    } catch {
      // ignore corrupt history
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      // Drop legacy v1 blob once v2 is being written
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // ignore quota errors
    }
  }, [entries, hydrated])

  const add = (messages: ChatMessage[]) => {
    if (!messages.length) return
    const thread: HistoryThread = {
      id: newId(),
      messages,
      ts: Date.now(),
    }
    setEntries(prev => [thread, ...prev].slice(0, MAX_ENTRIES))
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

function previewText(thread: HistoryThread): string {
  const firstUser = thread.messages.find(m => m.role === 'user')
  return firstUser?.content ?? '(empty thread)'
}

type Props = {
  open: boolean
  onClose: () => void
  entries: HistoryThread[]
  onSelect: (entry: HistoryThread) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function HistoryDrawer({ open, onClose, entries, onSelect, onRemove, onClear }: Props) {
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
            {entries.length} {entries.length === 1 ? 'thread' : 'threads'}
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
              <p>No conversations yet.</p>
              <p className="drawer-empty-hint">
                Every chat you finish will be logged here automatically.
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
                  <span className="history-entry-q">{previewText(entry)}</span>
                  <span className="history-entry-time">
                    {entry.messages.length} msg · {formatRelative(entry.ts)}
                  </span>
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
