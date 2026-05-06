'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateEmail(email)) {
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

      <div className="card" style={{ maxWidth: '480px' }}>
        <div className="card-header">
          <span className="card-header-dot" style={{ background: 'var(--danger)' }} />
          <span className="card-header-dot" style={{ background: 'var(--accent)' }} />
          <span className="card-header-dot" style={{ background: 'var(--success)' }} />
          <span className="card-header-title">Sign In</span>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: '0.95rem',
                lineHeight: '1.6',
                padding: '0.9rem 1rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              placeholder="your@email.com"
            />
          </div>

          <div className="input-section" style={{ borderBottom: 'none' }}>
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: '0.95rem',
                lineHeight: '1.6',
                padding: '0.9rem 1rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="error-section">
              <div className="error-msg"><span>⚠</span><span>{error}</span></div>
              <button type="button" className="btn-dismiss" onClick={() => setError('')}>Dismiss</button>
            </div>
          )}

          <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Signing in...</>
                : 'Sign In'}
            </button>
          </div>
        </form>
      </div>

      <footer className="footer">
        <span className="footer-note">Don't have an account?</span>
        <Link
          href="/signup"
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '0.82rem',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
        >
          Sign up →
        </Link>
      </footer>
    </div>
  )
}