'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { ChecklistItem, Project, ProjectStatus } from '../lib/types'

const MAX_CHECKLIST = 30
const DEBOUNCE_MS = 300

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random())
}

function statusBadgeClass(status: ProjectStatus): string {
  return `status-badge status-${status}`
}

type Props = {
  open: boolean
  onClose: () => void
  activeProject: Project | null
  onSelect: (project: Project | null) => void
  onProjectUpdate: (project: Project) => void
}

export function ProjectPanel({ open, onClose, activeProject, onSelect, onProjectUpdate }: Props) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTask, setNewTask] = useState('')
  const checklistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })
        if (fetchError) throw fetchError
        if (!cancelled) {
          const normalized = (data ?? []).map(p => ({
            ...p,
            checklist: Array.isArray(p.checklist) ? p.checklist : [],
          })) as Project[]
          setProjects(normalized)
          if (activeProject) {
            const updated = normalized.find(p => p.id === activeProject.id)
            if (updated) onProjectUpdate(updated)
          }
        }
      } catch (err: any) {
        console.error('projects fetch failed', err)
        if (!cancelled) setError(err?.message || 'Could not load projects.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  const handleCreate = async () => {
    if (!user) return
    const name = newName.trim()
    if (!name) {
      setError('Please enter a project name.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name,
          description: newDesc.trim() || null,
        })
        .select('*')
        .single()
      if (insertError) throw insertError
      const project = { ...data, checklist: [] } as Project
      setProjects(prev => [project, ...prev])
      setNewName('')
      setNewDesc('')
      onSelect(project)
      onClose()
    } catch (err: any) {
      console.error('projects insert failed', err)
      setError(err?.message || 'Could not create the project.')
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!activeProject) return
    const updated = { ...activeProject, status }
    onProjectUpdate(updated)
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', activeProject.id)
      if (updateError) throw updateError
    } catch (err: any) {
      console.error('projects status update failed', err)
      setError(err?.message || 'Could not change status.')
    }
  }

  const persistChecklist = (projectId: string, checklist: ChecklistItem[]) => {
    if (checklistTimer.current) clearTimeout(checklistTimer.current)
    checklistTimer.current = setTimeout(async () => {
      try {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ checklist })
          .eq('id', projectId)
        if (updateError) throw updateError
      } catch (err: any) {
        console.error('checklist persist failed', err)
        setError(err?.message || 'Checklist did not save.')
      }
    }, DEBOUNCE_MS)
  }

  const updateChecklist = (next: ChecklistItem[]) => {
    if (!activeProject) return
    const updated = { ...activeProject, checklist: next }
    onProjectUpdate(updated)
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    persistChecklist(activeProject.id, next)
  }

  const handleAddTask = () => {
    if (!activeProject) return
    const text = newTask.trim()
    if (!text) return
    if (activeProject.checklist.length >= MAX_CHECKLIST) {
      setError(`Maximum ${MAX_CHECKLIST} checklist items.`)
      return
    }
    updateChecklist([
      ...activeProject.checklist,
      { id: newId(), text, done: false },
    ])
    setNewTask('')
  }

  const handleToggleTask = (id: string) => {
    if (!activeProject) return
    updateChecklist(
      activeProject.checklist.map(item =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    )
  }

  const handleDeleteTask = (id: string) => {
    if (!activeProject) return
    updateChecklist(activeProject.checklist.filter(item => item.id !== id))
  }

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`project-panel ${open ? 'open' : ''}`}
        role="dialog"
        aria-label="Projects"
        aria-hidden={!open}
      >
        <div className="drawer-header">
          <span className="card-section">§ Workshop / Projects</span>
          <span className="card-rule" aria-hidden="true" />
          <button
            className="btn-dismiss drawer-close"
            onClick={onClose}
            aria-label="Close projects"
          >
            ✕
          </button>
        </div>

        <div className="project-create">
          <input
            className="input-text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New project name"
            maxLength={80}
          />
          <input
            className="input-text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            maxLength={200}
          />
          <button
            className="btn-primary btn-block"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            {creating ? 'Creating…' : '＋ Start Project'}
          </button>
          {activeProject && (
            <button
              className="btn-ghost btn-block"
              onClick={() => { onSelect(null); onClose() }}
            >
              ⨯ Leave current project
            </button>
          )}
        </div>

        {error && (
          <div className="error-section">
            <div className="error-msg"><span>⚠</span><span>{error}</span></div>
            <button className="btn-dismiss" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {activeProject && (
          <div className="project-detail">
            <div className="project-detail-name">{activeProject.name}</div>
            <div className="status-toggle">
              {(['active', 'completed', 'archived'] as ProjectStatus[]).map(s => (
                <button
                  key={s}
                  className={activeProject.status === s ? 'active' : ''}
                  onClick={() => handleStatusChange(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="checklist-header">
              <span className="checklist-title">Checklist</span>
              <span className="checklist-count">
                {activeProject.checklist.filter(i => i.done).length}/{activeProject.checklist.length} · max {MAX_CHECKLIST}
              </span>
            </div>
            <div className="checklist">
              {activeProject.checklist.map(item => (
                <div key={item.id} className={`checklist-item ${item.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleToggleTask(item.id)}
                    aria-label={`Mark "${item.text}" as ${item.done ? 'not done' : 'done'}`}
                  />
                  <span className="checklist-item-text">{item.text}</span>
                  <button
                    className="checklist-item-del"
                    onClick={() => handleDeleteTask(item.id)}
                    aria-label="Delete item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="checklist-add">
              <input
                className="input-text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }}
                placeholder="Add a task…"
                maxLength={120}
                disabled={activeProject.checklist.length >= MAX_CHECKLIST}
              />
              <button
                onClick={handleAddTask}
                disabled={activeProject.checklist.length >= MAX_CHECKLIST || !newTask.trim()}
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="drawer-list">
          {loading ? (
            <div className="loading-state"><div className="spinner" />Loading…</div>
          ) : projects.length === 0 ? (
            <div className="drawer-empty">
              <div className="drawer-empty-mark">∅</div>
              <p>No projects yet — start one to save your conversations.</p>
            </div>
          ) : (
            projects.map(project => {
              const isActive = activeProject?.id === project.id
              return (
                <button
                  key={project.id}
                  className={`project-entry ${isActive ? 'active' : ''}`}
                  onClick={() => { onSelect(project); onClose() }}
                >
                  <div className="project-entry-body">
                    <span className="project-entry-name">{project.name}</span>
                    {project.description && (
                      <span className="project-entry-desc">{project.description}</span>
                    )}
                  </div>
                  <span className={statusBadgeClass(project.status)}>{project.status}</span>
                </button>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}
