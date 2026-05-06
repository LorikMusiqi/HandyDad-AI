'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
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
      await signUp(email, password, name)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
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
          <span className="card-section">§ B / New Entry</span>
          <span className="card-rule" aria-hidden="true" />
          <span className="card-title">Create Account</span>
          <span className="card-rule" aria-hidden="true" />
          <span className="card-id">№ AUTH‑02</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-section">
            <label className="input-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="input-text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

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
              autoComplete="new-password"
              required
              className="input-text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
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
                ? <><span className="spinner spinner-sm" /> Creating account…</>
                : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>

      <footer className="footer">
        <span className="footer-note">Already have an account?</span>
        <Link href="/login" className="btn-link">Sign in →</Link>
      </footer>
    </div>
  )
}
