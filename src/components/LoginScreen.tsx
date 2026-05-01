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

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const heading =
    mode === 'sign-in' ? 'Sign in to your account'
    : mode === 'sign-up' ? 'Create your account'
    : 'Reset your password'

  return (
    <div className="login-root">
      <style>{`
        .login-root {
          min-height: 100dvh;
          background: #111827;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 0;
        }
        .login-input {
          display: block;
          width: 100%;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          padding: 6px 12px;
          font-size: 14px;
          color: #fff;
          outline: 1px solid rgba(255,255,255,0.1);
          outline-offset: -1px;
          transition: outline-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.25); }
        .login-input:focus {
          outline: 2px solid #e25822;
          outline-offset: -2px;
          box-shadow: none;
        }
        .login-btn-primary {
          display: flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          gap: 8px;
          border-radius: 6px;
          background: #e25822;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .login-btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .login-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-btn-google {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: background 0.15s;
        }
        .login-btn-google:hover { background: rgba(255,255,255,0.18); }
        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center">
          <Logo size={40} />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          {heading}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px] px-4">
        <div
          className="px-6 py-12 sm:rounded-lg sm:px-12"
          style={{
            background: 'rgba(255,255,255,0.05)',
            outline: '1px solid rgba(255,255,255,0.1)',
            outlineOffset: '-1px',
          }}
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div
                className="rounded-md p-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {error}
              </div>
            )}
            {message && (
              <div
                className="rounded-md p-3 text-sm"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}
              >
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email address
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="login-input"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  required
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="login-input"
                  placeholder={mode === 'sign-up' ? 'At least 6 characters' : ''}
                />
              </div>
            )}

            {mode === 'sign-up' && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-white mb-2">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  name="confirm-password"
                  required
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="login-input"
                  placeholder="Repeat your password"
                />
              </div>
            )}

            {mode === 'sign-in' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { resetForm(); setMode('forgot') }}
                  className="text-sm font-semibold"
                  style={{ color: '#e25822', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div>
              <button type="submit" disabled={loading} className="login-btn-primary">
                {loading && <span className="login-spinner" />}
                {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
              </button>
            </div>
          </form>

          {mode === 'sign-in' && (
            <div>
              <div className="mt-10 flex items-center gap-6">
                <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <p className="text-sm font-medium text-white whitespace-nowrap">Or continue with</p>
                <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              </div>

              <div className="mt-6">
                <button onClick={handleGoogleSignIn} className="login-btn-google">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
                    <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                    <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                    <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                    <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {mode === 'sign-in' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => { resetForm(); setMode('sign-up') }}
                className="font-semibold"
                style={{ color: '#e25822', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { resetForm(); setMode('sign-in') }}
                className="font-semibold"
                style={{ color: '#e25822', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
