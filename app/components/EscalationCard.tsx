'use client'

export function EscalationCard({ reason }: { reason: string }) {
  return (
    <div className="escalation-card" role="alert">
      <h3 className="escalation-heading">⚠ Professional Work Recommended</h3>
      {reason && <p className="escalation-reason">{reason}</p>}
      <p className="escalation-note">
        HandyDad will still walk you through what's involved so you understand the job.
      </p>
      <a
        className="escalation-cta"
        href="https://www.angi.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Find a Local Pro →
      </a>
    </div>
  )
}
