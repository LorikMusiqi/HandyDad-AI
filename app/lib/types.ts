// Shared types for the HandyDad AI app.
// UI vs wire shapes are kept distinct: ChatMessage is for in-app state,
// ApiMessage is the stripped shape sent to /api/chat.

export type ChatRole = 'user' | 'assistant' | 'error'

export type EstimateMeta = {
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  time: string
  cost: string
  diy: boolean
  escalate: boolean
  escalate_reason: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  estimate?: EstimateMeta | null
  ts?: number
}

export type ApiMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type HistoryThread = {
  id: string
  messages: ChatMessage[]
  ts: number
}

export type ChecklistItem = {
  id: string
  text: string
  done: boolean
}

export type ProjectStatus = 'active' | 'completed' | 'archived'

export type Project = {
  id: string
  user_id: string
  name: string
  description: string | null
  status: ProjectStatus
  checklist: ChecklistItem[]
  created_at: string
  updated_at: string
}

export type ProjectMessage = {
  id: string
  project_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type SavedGuide = {
  id: string
  user_id: string
  title: string
  content: string
  tags: string[]
  note: string | null
  created_at: string
}
