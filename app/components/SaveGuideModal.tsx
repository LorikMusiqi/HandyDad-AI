'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Props = {
  open: boolean
  onClose: () => void
  defaultTitle: string
  content: string
  onSaved: () => void
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export function SaveGuideModal({ open, onClose, defaultTitle, content, onSaved }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState(defaultTitle)
  const [tags, setTags] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setTags('')
      setNote('')
      setError('')
    }
  }, [open, defaultTitle])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSave = async () => {
    if (!user) {
      setError('You must be signed in to save guides.')
      return
    }
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Please enter a title.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('saved_guides').insert({
        user_id: user.id,
        title: trimmedTitle,
        content,
        tags: parseTags(tags),
        note: note.trim() || null,
      })
      if (insertError) throw insertError
      onSaved()
      onClose()
    } catch (err: any) {
      console.error('saved_guides insert failed', err)
      setError(err?.message || 'Could not save the guide.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="drawer-backdrop open" onClick={onClose} aria-hidden="true" />
      <div className="modal-shell" role="dialog" aria-label="Save guide">
        <div className="card">
          <div className="card-header">
            <span className="card-section">§ Save / Guide</span>
            <span className="card-rule" aria-hidden="true" />
            <span className="card-title">Bookmark Answer</span>
            <span className="card-rule" aria-hidden="true" />
            <button
              className="btn-dismiss drawer-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="input-section">
            <label className="input-label" htmlFor="guide-title">Title</label>
            <input
              id="guide-title"
              className="input-text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="What is this guide about?"
            />
          </div>

          <div className="input-section">
            <label className="input-label" htmlFor="guide-tags">Tags (comma-separated)</label>
            <input
              id="guide-tags"
              className="input-text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="plumbing, kitchen, leaky-faucet"
            />
          </div>

          <div className="input-section">
            <label className="input-label" htmlFor="guide-note">Personal note (optional)</label>
            <textarea
              id="guide-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Anything you want to remember about this job…"
            />
          </div>

          {error && (
            <div className="error-section">
              <div className="error-msg"><span>⚠</span><span>{error}</span></div>
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn-primary btn-block"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Guide'}
            </button>
            <button className="btn-ghost btn-block" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
