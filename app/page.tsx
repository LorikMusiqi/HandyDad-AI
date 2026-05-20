'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { ThemePicker } from './components/ThemePicker'
import { HistoryDrawer, useHistory, HistoryEntry } from './components/HistoryDrawer'

const TIP_QUESTIONS = [
  'Replace a light switch',
  'Unclog a drain',
  'Patch drywall',
  'Fix a squeaky floor',
]

const MAX_CHARS = 1000

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

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const { entries: history, add: addHistory, remove: removeHistory, clear: clearHistory } = useHistory()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/landing')
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="shell">
        <div className="loading-state">
          <div className="spinner" />
          Loading…
        </div>
      </div>
    )
  }

  if (!user) return null

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    // Edge case 1: Empty input
    if (!input.trim()) {
      setError('Please describe your repair or task before asking.')
      return
    }

    // Edge case 2: Input too long
    if (input.trim().length > MAX_CHARS) {
      setError(`Your question is too long. Please keep it under ${MAX_CHARS} characters.`)
      return
    }

    // Edge case 3: Double submit prevention
    if (loading) return

    const askedQuestion = input.trim()
    setResponse('')
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: askedQuestion }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || res.statusText)
      const text = data.text ?? ''
      setResponse(text)
      if (text) addHistory({ question: askedQuestion, response: text })
    } catch (err: any) {
      // Edge case 4: Network error vs API error
      if (!navigator.onLine) {
        setError('No internet connection. Please check your network and try again.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSelectHistory = (entry: HistoryEntry) => {
    setInput(entry.question)
    setResponse(entry.response)
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const charColor = input.length > MAX_CHARS
    ? 'var(--danger)'
    : input.length > 800
    ? 'var(--accent-hover)'
    : undefined

  return (
    <div className="shell">
      <header className="header">
        <div className="logo-group">
          <div className="logo-icon">🔧</div>
          <div className="logo-text">
            <h1>HandyDad AI</h1>
            <p>Your expert guide for home repairs</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn-ghost"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open question history"
          >
            <span aria-hidden="true">≡</span>
            History
            {history.length > 0 && <span className="btn-badge">{history.length}</span>}
          </button>
          <ThemePicker />
          <button className="btn-ghost" onClick={signOut}>Logout</button>
        </div>
      </header>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={history}
        onSelect={handleSelectHistory}
        onRemove={removeHistory}
        onClear={clearHistory}
      />

      <div className="card">
        <div className="card-header">
          <span className="card-section">§ 01 / Workshop</span>
          <span className="card-rule" aria-hidden="true" />
          <span className="card-title">Ask Your Question</span>
          <span className="card-rule" aria-hidden="true" />
          <span className="card-id">№ HD‑0247</span>
        </div>

        {loading && <div className="loading-bar"><div className="loading-bar-inner" /></div>}

        <div className="input-section">
          <label className="input-label" htmlFor="question">Describe your repair or task</label>
          <div className="textarea-wrap">
            <textarea
              id="question"
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder="e.g. How do I fix a leaky faucet? My toilet keeps running. How to patch drywall…"
            />
            <span className="kbd-hint">⌘↵ to send</span>
          </div>
          <div className="actions">
            <button
              className="btn-primary"
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim() || input.length > MAX_CHARS}
            >
              {loading
                ? <><span className="spinner spinner-sm" /> Working on it…</>
                : <>🔨 Ask HandyDad</>}
            </button>
            <button className="btn-ghost" onClick={() => { setInput(''); setResponse(''); setError('') }}>
              ✕ Clear
            </button>
            <span className="char-count" style={{ color: charColor }}>
              {input.length}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            Consulting 40 years of experience…
          </div>
        )}

        {response && !loading && (
          <div className="response-section">
            <div className="response-badge">HandyDad's Answer</div>
            <ResponseBlock text={response} />
          </div>
        )}

        {error && (
          <div className="error-section">
            <div className="error-msg"><span>⚠</span><span>{error}</span></div>
            <button className="btn-dismiss" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
      </div>

      <footer className="footer">
        <span className="footer-note">Powered by Groq · Always verify safety with a professional</span>
        <div className="tip-chips">
          {TIP_QUESTIONS.map(q => (
            <button key={q} className="tip-chip" onClick={() => setInput(q)}>{q}</button>
          ))}
        </div>
      </footer>
    </div>
  )
}