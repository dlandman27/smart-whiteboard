import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export function LoginScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'var(--wt-surface)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background:   'var(--wt-bg)',
          border:       '1px solid var(--wt-border)',
          boxShadow:    'var(--wt-shadow-lg)',
        }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--wt-text)' }}>
            Smart Whiteboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            Sign in to access your boards
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand:       '#3b82f6',
                  brandAccent: '#2563eb',
                },
                radii: {
                  borderRadiusButton: '0.75rem',
                  inputBorderRadius:  '0.75rem',
                },
              },
            },
          }}
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  )
}
