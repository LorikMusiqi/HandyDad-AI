import type { EstimateMeta } from './types'

const VALID_DIFFICULTY = new Set(['Beginner', 'Intermediate', 'Advanced'])

function stripQuotes(s: string): string {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function parseBool(v: string): boolean | null {
  const t = v.trim().toLowerCase()
  if (t === 'true' || t === 'yes') return true
  if (t === 'false' || t === 'no') return false
  return null
}

export function parseEstimate(raw: string): { text: string; estimate: EstimateMeta | null } {
  if (!raw || typeof raw !== 'string') return { text: raw ?? '', estimate: null }

  const opener = /^---[ \t]*\r?\n/
  const m = raw.match(opener)
  if (!m) return { text: raw, estimate: null }

  const afterOpen = raw.slice(m[0].length)
  const closeMatch = afterOpen.match(/\r?\n---[ \t]*\r?\n/)
  if (!closeMatch) return { text: raw, estimate: null }

  const block = afterOpen.slice(0, closeMatch.index!)
  const rest = afterOpen.slice(closeMatch.index! + closeMatch[0].length)

  const fields: Record<string, string> = {}
  for (const line of block.split(/\r?\n/)) {
    const lineMatch = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i)
    if (lineMatch) fields[lineMatch[1].toLowerCase()] = stripQuotes(lineMatch[2])
  }

  const difficulty = fields.difficulty?.trim()
  const time = fields.time?.trim()
  const cost = fields.cost?.trim()
  const diyParsed = fields.diy != null ? parseBool(fields.diy) : null

  if (!difficulty || !VALID_DIFFICULTY.has(difficulty)) return { text: raw, estimate: null }
  if (!time || !cost || diyParsed === null) return { text: raw, estimate: null }

  const escalateParsed = fields.escalate != null ? parseBool(fields.escalate) : false
  const escalate = escalateParsed ?? false
  const escalate_reason = (fields.escalate_reason ?? '').trim()

  return {
    text: rest.replace(/^\r?\n+/, ''),
    estimate: {
      difficulty: difficulty as EstimateMeta['difficulty'],
      time,
      cost,
      diy: diyParsed,
      escalate,
      escalate_reason,
    },
  }
}
