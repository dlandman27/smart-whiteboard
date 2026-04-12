import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

type Mode = 'sign-in' | 'sign-up' | 'forgot'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [mode])

  function resetForm() {
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPw('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'sign-up') {
        if (password !== confirmPw) { setError('Passwords do not match'); setLoading(false); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage('Password reset link sent to your email')
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const heading = mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create your account' : 'Reset password'
  const subtitle = mode === 'sign-in'
    ? 'Sign in to your whiteboard'
    : mode === 'sign-up'
      ? 'Get started with your smart display'
      : 'We\'ll send you a reset link'

  return (
    <div className="login-screen">
      <style>{`
        .login-screen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--wt-bg);
          overflow: hidden;
        }

        /* Subtle gradient orbs in background */
        .login-screen::before,
        .login-screen::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.08;
          pointer-events: none;
        }
        .login-screen::before {
          width: 600px;
          height: 600px;
          top: -200px;
          right: -100px;
          background: var(--wt-accent);
        }
        .login-screen::after {
          width: 500px;
          height: 500px;
          bottom: -150px;
          left: -100px;
          background: #8b5cf6;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: 48px 40px 40px;
          border-radius: 20px;
          background: var(--wt-bg-surface);
          border: 1px solid var(--wt-border);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15);
          animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .login-logo-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .login-brand {
          margin-top: 16px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--wt-text);
          opacity: 0.4;
        }

        .login-heading {
          font-size: 22px;
          font-weight: 600;
          color: var(--wt-text);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .login-subtitle {
          font-size: 14px;
          color: var(--wt-text);
          opacity: 0.45;
          margin: 0 0 28px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .login-field {
          position: relative;
        }

        .login-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--wt-text);
          opacity: 0.55;
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }

        .login-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid var(--wt-border);
          background: var(--wt-bg);
          color: var(--wt-text);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .login-input::placeholder {
          color: var(--wt-text);
          opacity: 0.25;
        }

        .login-input:focus {
          border-color: var(--wt-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--wt-accent) 15%, transparent);
        }

        .login-btn {
          margin-top: 6px;
          padding: 12px 0;
          border-radius: 10px;
          border: none;
          background: var(--wt-accent);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          letter-spacing: 0.01em;
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .login-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-error {
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 13px;
          animation: shakeIn 0.3s ease;
        }

        .login-message {
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #4ade80;
          font-size: 13px;
        }

        @keyframes shakeIn {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .login-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 13px;
          color: var(--wt-text);
          opacity: 0.45;
        }

        .login-link {
          color: var(--wt-accent);
          cursor: pointer;
          font-weight: 500;
          border: none;
          background: none;
          padding: 0;
          font-size: inherit;
          text-decoration: none;
          opacity: 1;
        }

        .login-link:hover {
          text-decoration: underline;
        }

        .login-forgot {
          display: inline-block;
          margin-top: 2px;
          font-size: 12px;
          color: var(--wt-text);
          opacity: 0.35;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }

        .login-forgot:hover {
          opacity: 0.6;
        }

        .login-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="login-card">
        <div className="login-logo-area">
          <Logo size={48} />
          <span className="login-brand">Walli</span>
        </div>

        <h1 className="login-heading">{heading}</h1>
        <p className="login-subtitle">{subtitle}</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-message">{message}</div>}

          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              ref={emailRef}
              className="login-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                className="login-input"
                type="password"
                placeholder={mode === 'sign-up' ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              />
              {mode === 'sign-in' && (
                <button
                  type="button"
                  className="login-forgot"
                  onClick={() => { resetForm(); setMode('forgot') }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {mode === 'sign-up' && (
            <div className="login-field">
              <label className="login-label">Confirm password</label>
              <input
                className="login-input"
                type="password"
                placeholder="Repeat your password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading && <span className="login-spinner" />}
            {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'sign-in' ? (
            <>
              Don't have an account?{' '}
              <button className="login-link" onClick={() => { resetForm(); setMode('sign-up') }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="login-link" onClick={() => { resetForm(); setMode('sign-in') }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
