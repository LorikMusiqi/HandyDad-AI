'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Already signed in? Skip the pitch and go to the workshop.
  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

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
        <Link href="/login" className="btn-ghost">Sign In</Link>
      </header>

      <section className="hero">
        <div className="hero-stamp">§ Manual / Vol. 01</div>
        <h2 className="hero-title">
          Home repairs,<br />
          explained like<br />
          <span className="hero-title-accent">dad would.</span>
        </h2>
        <p className="hero-tagline">
          Ask any home‑repair question and get a step‑by‑step tutorial — with
          safety checks, tool lists, and the kind of <em>"watch out for this"</em>
          {' '}advice a 40‑year handyman would actually give you.
        </p>
        <div className="hero-cta-row">
          <Link href="/signup" className="btn-primary">
            🔨 Get Started
          </Link>
          <Link href="/login" className="btn-ghost">
            I already have an account
          </Link>
        </div>
      </section>

      <div className="section-divider">
        <span className="section-divider-rule" />
        <span className="section-divider-text">What's in the toolbox</span>
        <span className="section-divider-rule" />
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-card-icon">📋</div>
          <h3 className="feature-card-title">Step‑by‑Step</h3>
          <p className="feature-card-body">
            Every answer is structured: what we're doing, tools needed, the
            actual steps, and what could go wrong.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">⚠️</div>
          <h3 className="feature-card-title">Safety‑First</h3>
          <p className="feature-card-body">
            Electrical, plumbing, gas — every risky task starts with a safety
            check before you touch anything.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">💡</div>
          <h3 className="feature-card-title">Dad Tips</h3>
          <p className="feature-card-body">
            Real "your old man's been doing this for forty years" wisdom you
            won't find in a manual.
          </p>
        </div>
      </div>

      <div className="section-divider">
        <span className="section-divider-rule" />
        <span className="section-divider-text">How it works</span>
        <span className="section-divider-rule" />
      </div>

      <ol className="howto-list">
        <li>
          <span className="howto-num">01</span>
          <div>
            <h4>Type a question</h4>
            <p>
              "How do I fix a leaky faucet?" — "What's wrong with my drywall?"
              — "Why does my toilet keep running?"
            </p>
          </div>
        </li>
        <li>
          <span className="howto-num">02</span>
          <div>
            <h4>Get a real tutorial</h4>
            <p>
              Tools, safety checks, ordered steps, common mistakes, and a
              dad tip — all in one go.
            </p>
          </div>
        </li>
        <li>
          <span className="howto-num">03</span>
          <div>
            <h4>Build skill, save money</h4>
            <p>
              Stop calling the handyman for the easy stuff. Learn enough to
              know when it's actually worth the call.
            </p>
          </div>
        </li>
      </ol>

      <div className="hero-cta-row hero-cta-end">
        <Link href="/signup" className="btn-primary">
          Start your first repair →
        </Link>
      </div>

      <footer className="footer">
        <span className="footer-note">
          Powered by Groq · Always verify safety with a professional
        </span>
      </footer>
    </div>
  )
}
