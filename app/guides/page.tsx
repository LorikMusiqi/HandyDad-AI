'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ThemePicker } from '../components/ThemePicker'
import type { SavedGuide } from '../lib/types'

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="resp-code">{part.slice(1, -1)}</code>
    return part
  })
}

function ResponseBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="response-body">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="resp-h3">{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={i} className="resp-h2">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="resp-h1">{line.slice(2)}</h1>
        if (line.startsWith('---')) return <hr key={i} className="resp-hr" />
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="resp-li">{renderInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="resp-li resp-li-num">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (line.trim() === '') return <div key={i} className="resp-gap" />
        return <p key={i} className="resp-p">{renderInline(line)}</p>
      })}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch { return iso }
}

function previewOf(content: string, max = 140): string {
  const stripped = content.replace(/^[#>\-*\d.\s]+/gm, '').replace(/\n+/g, ' ').trim()
  return stripped.length > max ? stripped.slice(0, max - 1) + '…' : stripped
}

type EditDraft = { title: string; tagsInput: string; note: string }

export default function GuidesPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [guides, setGuides] = useState<SavedGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Record<string, EditDraft>>({})

  useEffect(() => {
    if (!authLoading && !user) router.push('/landing')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('saved_guides')
          .select('*')
          .order('created_at', { ascending: false })
        if (fetchError) throw fetchError
        if (!cancelled) setGuides((data ?? []) as SavedGuide[])
      } catch (err: any) {
        console.error('saved_guides fetch failed', err)
        if (!cancelled) setError(err?.message || 'Could not load guides.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return guides
    return guides.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q)),
    )
  }, [search, guides])

  if (authLoading || !user) {
    return (
      <div className="shell">
        <div className="loading-state"><div className="spinner" />Loading…</div>
      </div>
    )
  }

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const startEdit = (guide: SavedGuide) => {
    setEditing(prev => ({
      ...prev,
      [guide.id]: {
        title: guide.title,
        tagsInput: guide.tags.join(', '),
        note: guide.note ?? '',
      },
    }))
  }

  const cancelEdit = (id: string) => {
    setEditing(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const saveEdit = async (guide: SavedGuide) => {
    const draft = editing[guide.id]
    if (!draft) return
    const tags = draft.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 12)
    const update = {
      title: draft.title.trim() || guide.title,
      tags,
      note: draft.note.trim() || null,
    }
    const optimistic = guides.map(g => (g.id === guide.id ? { ...g, ...update } : g))
    setGuides(optimistic)
    cancelEdit(guide.id)
    try {
      const { error: updateError } = await supabase
        .from('saved_guides')
        .update(update)
        .eq('id', guide.id)
      if (updateError) throw updateError
    } catch (err: any) {
      console.error('saved_guides update failed', err)
      setError(err?.message || 'Could not save changes.')
    }
  }

  const deleteGuide = async (guide: SavedGuide) => {
    if (!window.confirm(`Delete "${guide.title}"?`)) return
    const before = guides
    setGuides(prev => prev.filter(g => g.id !== guide.id))
    try {
      const { error: deleteError } = await supabase
        .from('saved_guides')
        .delete()
        .eq('id', guide.id)
      if (deleteError) throw deleteError
    } catch (err: any) {
      console.error('saved_guides delete failed', err)
      setError(err?.message || 'Could not delete the guide.')
      setGuides(before)
    }
  }

  return (
    <div className="shell">
      <header className="header">
        <div className="logo-group">
          <div className="logo-icon">🔧</div>
          <div className="logo-text">
            <h1>HandyDad AI</h1>
            <p>Saved guides</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-ghost" onClick={() => router.push('/')}>
            ← Back to chat
          </button>
          <ThemePicker />
          <button className="btn-ghost" onClick={signOut}>Logout</button>
        </div>
      </header>

      <div className="guides-toolbar">
        <input
          className="input-text guides-search"
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or tags…"
        />
        <span className="drawer-count">
          {filtered.length} of {guides.length} {guides.length === 1 ? 'guide' : 'guides'}
        </span>
      </div>

      {error && (
        <div className="error-section" style={{ width: '100%', maxWidth: 780, borderRadius: 10 }}>
          <div className="error-msg"><span>⚠</span><span>{error}</span></div>
          <button className="btn-dismiss" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="spinner" />Loading guides…</div>
      ) : guides.length === 0 ? (
        <div className="guides-empty">
          <div className="drawer-empty-mark">∅</div>
          <p>No guides saved yet.</p>
          <p className="drawer-empty-hint">Bookmark any answer from the chat to save it here.</p>
        </div>
      ) : (
        <div className="guide-list">
          {filtered.map(guide => {
            const isExpanded = !!expanded[guide.id]
            const draft = editing[guide.id]
            return (
              <article key={guide.id} className="guide-card">
                <div className="guide-card-head">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {draft ? (
                      <input
                        className="input-text"
                        value={draft.title}
                        onChange={e => setEditing(prev => ({
                          ...prev,
                          [guide.id]: { ...prev[guide.id], title: e.target.value },
                        }))}
                      />
                    ) : (
                      <button
                        className="guide-card-title"
                        onClick={() => toggleExpanded(guide.id)}
                        style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left' }}
                      >
                        {guide.title}
                      </button>
                    )}
                    <div className="guide-card-meta">{formatDate(guide.created_at)}</div>
                    {!draft && guide.tags.length > 0 && (
                      <div className="guide-tags">
                        {guide.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="guide-card-actions">
                    {draft ? (
                      <>
                        <button className="btn-ghost" onClick={() => saveEdit(guide)}>Save</button>
                        <button className="btn-dismiss" onClick={() => cancelEdit(guide.id)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-ghost" onClick={() => startEdit(guide)}>Edit</button>
                        <button className="btn-dismiss" onClick={() => deleteGuide(guide)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>

                {!isExpanded && !draft && (
                  <div className="guide-card-preview" onClick={() => toggleExpanded(guide.id)} style={{ cursor: 'pointer' }}>
                    {previewOf(guide.content)}
                  </div>
                )}

                {draft && (
                  <div className="guide-edit-fields">
                    <input
                      className="input-text"
                      value={draft.tagsInput}
                      onChange={e => setEditing(prev => ({
                        ...prev,
                        [guide.id]: { ...prev[guide.id], tagsInput: e.target.value },
                      }))}
                      placeholder="Tags, comma-separated"
                    />
                    <textarea
                      value={draft.note}
                      rows={3}
                      onChange={e => setEditing(prev => ({
                        ...prev,
                        [guide.id]: { ...prev[guide.id], note: e.target.value },
                      }))}
                      placeholder="Personal note"
                    />
                  </div>
                )}

                {isExpanded && !draft && (
                  <div className="guide-card-expanded">
                    <ResponseBlock text={guide.content} />
                    {guide.note && <div className="guide-note">{guide.note}</div>}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <footer className="footer">
        <span className="footer-note">Your saved guides are stored in Supabase and only visible to you.</span>
      </footer>
    </div>
  )
}
