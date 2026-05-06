"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'

const THEMES = {
  "Workbench": {
    bg: "#1a1208", surface: "#2a1e0e", surfaceAlt: "#3a2a14", border: "#5c3d1a",
    accent: "#d97706", accentHover: "#f59e0b", accentText: "#fffbeb",
    text: "#f5e6c8", textMuted: "#a07850", danger: "#ef4444", success: "#22c55e",
  },
  "Garage Blue": {
    bg: "#0d1520", surface: "#162030", surfaceAlt: "#1e2d42", border: "#2a4060",
    accent: "#3b82f6", accentHover: "#60a5fa", accentText: "#eff6ff",
    text: "#dbeafe", textMuted: "#6b8fb5", danger: "#f87171", success: "#4ade80",
  },
  "Safety Orange": {
    bg: "#1a0e06", surface: "#221408", surfaceAlt: "#2e1c0c", border: "#6b2a04",
    accent: "#ea580c", accentHover: "#f97316", accentText: "#fff7ed",
    text: "#fed7aa", textMuted: "#9a5020", danger: "#ef4444", success: "#22c55e",
  },
  "Forest Green": {
    bg: "#0a130a", surface: "#111c11", surfaceAlt: "#182618", border: "#274027",
    accent: "#16a34a", accentHover: "#22c55e", accentText: "#f0fdf4",
    text: "#d1fae5", textMuted: "#4a8a60", danger: "#f87171", success: "#4ade80",
  },
  "Steel Gray": {
    bg: "#0f1117", surface: "#181c27", surfaceAlt: "#1f2437", border: "#303a52",
    accent: "#64748b", accentHover: "#94a3b8", accentText: "#f8fafc",
    text: "#e2e8f0", textMuted: "#64748b", danger: "#f87171", success: "#4ade80",
  },
}

type ThemeName = keyof typeof THEMES

function applyTheme(theme: typeof THEMES[ThemeName]) {
  const root = document.documentElement
  root.style.setProperty('--bg', theme.bg)
  root.style.setProperty('--surface', theme.surface)
  root.style.setProperty('--surface-alt', theme.surfaceAlt)
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-hover', theme.accentHover)
  root.style.setProperty('--accent-text', theme.accentText)
  root.style.setProperty('--text', theme.text)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--danger', theme.danger)
  root.style.setProperty('--success', theme.success)
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

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="resp-code">{part.slice(1, -1)}</code>
    return part
  })
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [activeTheme, setActiveTheme] = useState<ThemeName>('Workbench')
  const [themeOpen, setThemeOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    applyTheme(THEMES[activeTheme])
  }, [activeTheme])

  if (authLoading) {
    return (
      <div className="shell">
        <div className="loading-state">
          <div className="spinner" />
          Loading...
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setResponse('')
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      })
      if (!res.ok) throw new Error((await res.json()).error || res.statusText)
      const data = await res.json()
      setResponse(data.text ?? JSON.stringify(data))
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any)
  }

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

        <div className="theme-picker">
          <button className="theme-btn" onClick={() => setThemeOpen(o => !o)}>
            <span className="theme-swatch" />
            {activeTheme}
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          {themeOpen && (
            <div className="theme-dropdown">
              {(Object.keys(THEMES) as ThemeName[]).map(name => (
                <div
                  key={name}
                  className={`theme-option ${name === activeTheme ? 'active' : ''}`}
                  onClick={() => { setActiveTheme(name); setThemeOpen(false) }}
                >
                  <span className="theme-dot" style={{ background: THEMES[name].accent }} />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-ghost" onClick={signOut}>
          Logout
        </button>
      </header>

      <div className="card">
        <div className="card-header">
          <span className="card-header-dot" style={{ background: 'var(--danger)' }} />
          <span className="card-header-dot" style={{ background: 'var(--accent)' }} />
          <span className="card-header-dot" style={{ background: 'var(--success)' }} />
          <span className="card-header-title">Ask Your Question</span>
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
              placeholder="e.g. How do I fix a leaky faucet? My toilet keeps running. How to patch drywall..."
            />
            <span className="kbd-hint">⌘↵ to send</span>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={handleSubmit} disabled={loading || !input.trim()}>
              {loading
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Working on it...</>
                : <>🔨 Ask HandyDad</>}
            </button>
            <button className="btn-ghost" onClick={() => { setInput(''); setResponse(''); setError('') }}>
              ✕ Clear
            </button>
            <span className="char-count">{input.length} chars</span>
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
          {['Replace a light switch', 'Unclog a drain', 'Patch drywall', 'Fix a squeaky floor'].map(q => (
            <button key={q} className="tip-chip" onClick={() => setInput(q)}>{q}</button>
          ))}
        </div>
      </footer>
    </div>
  )
}