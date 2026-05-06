'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
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
      </header>

      <div className="card card-narrow">
        <div className="card-header">
          <span className="card-section">§ A / Intake</span>
          <span className="card-rule" aria-hidden="true" />
          <span className="card-title">Sign In</span>
          <span className="card-rule" aria-hidden="true" />
          <span className="card-id">№ AUTH‑01</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-section">
            <label className="input-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="input-section">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="error-section">
              <div className="error-msg"><span>⚠</span><span>{error}</span></div>
              <button type="button" className="btn-dismiss" onClick={() => setError('')}>Dismiss</button>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary btn-block">
              {loading
                ? <><span className="spinner spinner-sm" /> Signing in…</>
                : 'Sign In'}
            </button>
          </div>
        </form>
      </div>

      <footer className="footer">
        <span className="footer-note">Don't have an account?</span>
        <Link href="/signup" className="btn-link">Sign up →</Link>
      </footer>
    </div>
  )
}
