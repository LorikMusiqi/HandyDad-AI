'use client'

import type { EstimateMeta } from '../lib/types'

const DIFFICULTY_CLASS: Record<EstimateMeta['difficulty'], string> = {
  Beginner: 'estimate-difficulty-beginner',
  Intermediate: 'estimate-difficulty-intermediate',
  Advanced: 'estimate-difficulty-advanced',
}

export function EstimateBadge({ estimate }: { estimate: EstimateMeta }) {
  return (
    <div className="estimate-strip" role="group" aria-label="Job estimate summary">
      <div className={`estimate-item ${DIFFICULTY_CLASS[estimate.difficulty]}`}>
        <span className="estimate-icon" aria-hidden="true">🎚</span>
        <span className="estimate-label">Difficulty</span>
        <span className="estimate-value">{estimate.difficulty}</span>
      </div>
      <div className="estimate-item">
        <span className="estimate-icon" aria-hidden="true">⏱</span>
        <span className="estimate-label">Time</span>
        <span className="estimate-value">{estimate.time}</span>
      </div>
      <div className="estimate-item">
        <span className="estimate-icon" aria-hidden="true">💰</span>
        <span className="estimate-label">Cost</span>
        <span className="estimate-value">{estimate.cost}</span>
      </div>
      <div className={`estimate-item ${estimate.diy ? '' : 'estimate-difficulty-advanced'}`}>
        <span className="estimate-icon" aria-hidden="true">🔨</span>
        <span className="estimate-label">DIY</span>
        <span className="estimate-value">{estimate.diy ? 'Yes' : '⚠ Call a Pro'}</span>
      </div>
    </div>
  )
}
