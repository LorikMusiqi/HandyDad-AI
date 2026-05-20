'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { ThemePicker } from './components/ThemePicker'
import { HistoryDrawer, useHistory } from './components/HistoryDrawer'
import { EstimateBadge } from './components/EstimateBadge'
import { EscalationCard } from './components/EscalationCard'
import { SaveGuideModal } from './components/SaveGuideModal'
import { ProjectPanel } from './components/ProjectPanel'
import { supabase } from '../lib/supabase'
import type { ChatMessage, ApiMessage, HistoryThread, EstimateMeta, Project, ProjectMessage } from './lib/types'

const TIP_QUESTIONS = [
  'Replace a light switch',
  'Unclog a drain',
  'Patch drywall',
  'Fix a squeaky floor',
]

const MAX_CHARS = 1000

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())
}

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

function firstNonEmptyLine(text: string, max = 60): string {
  for (const line of text.split('\n')) {
    const t = line.replace(/^[#>\-*\s]+/, '').trim()
    if (t) return t.length > max ? t.slice(0, max - 1) + '…' : t
  }
  return 'Saved guide'
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({})
  const [guideModal, setGuideModal] = useState<{ open: boolean; messageId: string; content: string }>(
    { open: false, messageId: '', content: '' },
  )
  const { entries: history, upsert: upsertHistory, remove: removeHistory, clear: clearHistory, hydrated: historyHydrated } = useHistory()
  const restoredRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/landing')
  }, [user, authLoading, router])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages.length, loading])

  // Restore the most recent active thread once history has hydrated from
  // localStorage. Runs at most once per page load.
  useEffect(() => {
    if (!historyHydrated || restoredRef.current) return
    restoredRef.current = true
    try {
      const storedId = localStorage.getItem('handydad-current-thread')
      if (!storedId) return
      const found = history.find(h => h.id === storedId)
      if (found) {
        setMessages(found.messages)
        setCurrentThreadId(storedId)
      }
    } catch {
      // ignore localStorage errors
    }
  }, [historyHydrated, history])

  // Persist the current thread id so refresh restores the active conversation.
  useEffect(() => {
    if (!historyHydrated) return
    try {
      if (currentThreadId) {
        localStorage.setItem('handydad-current-thread', currentThreadId)
      } else {
        localStorage.removeItem('handydad-current-thread')
      }
    } catch {
      // ignore
    }
  }, [currentThreadId, historyHydrated])

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

  const lastError = messages.length && messages[messages.length - 1].role === 'error'
    ? messages[messages.length - 1]
    : null

  const persistProjectMessage = (projectId: string, role: 'user' | 'assistant', content: string) => {
    // Fire-and-forget. We never block UI on Supabase writes.
    supabase
      .from('project_messages')
      .insert({ project_id: projectId, role, content })
      .then(({ error: insertError }) => {
        if (insertError) console.error('project_messages insert failed', insertError)
      })
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return
    if (input.trim().length > MAX_CHARS) return
    if (loading) return

    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      content: input.trim(),
      ts: Date.now(),
    }

    // Capture the project id at submit time. If the user switches projects mid-stream,
    // the response still writes to the project that owned this exchange.
    const capturedProjectId = activeProject?.id ?? null

    // Capture the thread id too — both the pre-call and post-call upserts must
    // use the same id so a half-completed exchange becomes the same history
    // entry that the assistant reply will later complete.
    let capturedThreadId = currentThreadId
    if (!capturedProjectId && !capturedThreadId) {
      capturedThreadId = newId()
      setCurrentThreadId(capturedThreadId)
    }

    // Drop any trailing error message so it doesn't pollute the next exchange.
    const baseMessages = messages.filter(m => m.role !== 'error')
    const nextMessages = [...baseMessages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    if (capturedProjectId) persistProjectMessage(capturedProjectId, 'user', userMsg.content)
    // Save the user's question immediately so a crash/refresh before the
    // assistant replies still preserves what they asked.
    if (capturedThreadId) upsertHistory(capturedThreadId, nextMessages)

    const wire: ApiMessage[] = nextMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: wire }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || res.statusText)
      const text: string = data.text ?? ''
      const estimate: EstimateMeta | null = data.estimate ?? null
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: text,
        estimate,
        ts: Date.now(),
      }
      const finalMessages = [...nextMessages, assistantMsg]
      setMessages(finalMessages)
      if (capturedProjectId && text) persistProjectMessage(capturedProjectId, 'assistant', text)
      if (capturedThreadId) upsertHistory(capturedThreadId, finalMessages)
    } catch (err: any) {
      const reason = !navigator.onLine
        ? 'No internet connection. Please check your network and try again.'
        : err?.message || 'Something went wrong. Please try again.'
      setMessages(prev => {
        const next: ChatMessage[] = [
          ...prev,
          { id: newId(), role: 'error', content: reason, ts: Date.now() },
        ]
        if (capturedThreadId) upsertHistory(capturedThreadId, next)
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectHistory = (entry: HistoryThread) => {
    setActiveProject(null)
    setMessages(entry.messages)
    setCurrentThreadId(entry.id)
    setInput('')
  }

  const handleSelectProject = async (project: Project | null) => {
    setInput('')
    setCurrentThreadId(null)
    if (!project) {
      setActiveProject(null)
      setMessages([])
      return
    }
    setActiveProject(project)
    setMessages([])
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
      if (fetchError) throw fetchError
      const loaded: ChatMessage[] = ((data ?? []) as ProjectMessage[]).map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        ts: new Date(row.created_at).getTime(),
      }))
      setMessages(loaded)
    } catch (err: any) {
      console.error('project_messages fetch failed', err)
      setMessages([{ id: newId(), role: 'error', content: err?.message || 'Could not load project messages.', ts: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setCurrentThreadId(null)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const dismissError = () => {
    setMessages(prev => prev.filter(m => m.role !== 'error'))
  }

  const openGuideModal = (msg: ChatMessage) => {
    setGuideModal({ open: true, messageId: msg.id, content: msg.content })
  }

  const handleGuideSaved = () => {
    const id = guideModal.messageId
    setSavedFlash(prev => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      setSavedFlash(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }, 2000)
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

        <div className="header-actions">
          <button
            className="btn-ghost"
            onClick={() => setProjectsOpen(true)}
            aria-label="Open projects"
          >
            <span aria-hidden="true">□</span>
            Projects
            {activeProject && <span className="btn-badge">●</span>}
          </button>
          <button
            className="btn-ghost"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open conversation history"
          >
            <span aria-hidden="true">≡</span>
            History
            {history.length > 0 && <span className="btn-badge">{history.length}</span>}
          </button>
          <button
            className="btn-ghost"
            onClick={() => router.push('/guides')}
            aria-label="Open saved guides"
          >
            <span aria-hidden="true">⌘</span>
            Guides
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

      <ProjectPanel
        open={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        activeProject={activeProject}
        onSelect={handleSelectProject}
        onProjectUpdate={(p) => setActiveProject(p)}
      />

      <SaveGuideModal
        open={guideModal.open}
        onClose={() => setGuideModal({ open: false, messageId: '', content: '' })}
        defaultTitle={firstNonEmptyLine(guideModal.content)}
        content={guideModal.content}
        onSaved={handleGuideSaved}
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

        {activeProject && (
          <div className="active-project-banner">
            <span>Project</span>
            <strong>{activeProject.name}</strong>
            <span className={`status-badge status-${activeProject.status}`} style={{ marginLeft: 'auto' }}>
              {activeProject.status}
            </span>
          </div>
        )}

        {messages.length > 0 && (
          <div className="chat-thread">
            {messages.map(msg => {
              if (msg.role === 'error') return null
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="msg-bubble msg-user">
                    <div className="msg-content">{msg.content}</div>
                  </div>
                )
              }
              const est = msg.estimate
              return (
                <div key={msg.id} className="msg-bubble msg-assistant">
                  <div className="msg-toolbar">
                    <div className="response-badge">HandyDad's Answer</div>
                    <div className="msg-toolbar-actions">
                      {savedFlash[msg.id] && <span className="saved-flash">Saved ✓</span>}
                      <button
                        className="bookmark-btn"
                        onClick={() => openGuideModal(msg)}
                        aria-label="Save as guide"
                        title="Save this answer to your guides library"
                      >
                        <span aria-hidden="true">🔖</span> Save guide
                      </button>
                    </div>
                  </div>
                  {est?.escalate && <EscalationCard reason={est.escalate_reason} />}
                  {est && <EstimateBadge estimate={est} />}
                  <ResponseBlock text={msg.content} />
                </div>
              )
            })}
            {loading && (
              <div className="msg-bubble msg-assistant msg-loading">
                <div className="loading-state inline">
                  <div className="spinner" />
                  Consulting 40 years of experience…
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>
        )}

        <div className="input-section">
          <label className="input-label" htmlFor="question">
            {messages.length ? 'Ask a follow-up' : 'Describe your repair or task'}
          </label>
          <div className="textarea-wrap">
            <textarea
              id="question"
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder={messages.length
                ? "e.g. What tools do I need for step 3?"
                : "e.g. How do I fix a leaky faucet? My toilet keeps running. How to patch drywall…"}
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
                : <>🔨 {messages.length ? 'Send' : 'Ask HandyDad'}</>}
            </button>
            <button className="btn-ghost" onClick={handleClear}>
              ✕ {messages.length ? 'New chat' : 'Clear'}
            </button>
            <span className="char-count" style={{ color: charColor }}>
              {input.length}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {lastError && (
          <div className="error-section">
            <div className="error-msg"><span>⚠</span><span>{lastError.content}</span></div>
            <button className="btn-dismiss" onClick={dismissError}>Dismiss</button>
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
