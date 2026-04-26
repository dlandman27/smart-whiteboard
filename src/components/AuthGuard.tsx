import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useWhiteboardStore } from '../store/whiteboard'
import { useThemeStore } from '../store/theme'
import { startBoardSync, stopBoardSync } from '../lib/syncBoards'
import { startThemeSync, stopThemeSync } from '../lib/syncTheme'
import { startRealtimeSync, stopRealtimeSync } from '../lib/realtimeSync'
import { LoginScreen } from './LoginScreen'
import { TemplatePicker } from './TemplatePicker'
import { analytics } from '../lib/analytics'
import { Logo } from './Logo'

interface Props {
  children: React.ReactNode
}

const QUOTES = [
  { text: "The secret of getting ahead is getting started.",                                    author: "Mark Twain"           },
  { text: "Focus is a matter of deciding what things you're not going to do.",                  author: "John Carmack"         },
  { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey"   },
  { text: "Done is better than perfect.",                                                        author: "Sheryl Sandberg"     },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "You don't have to see the whole staircase, just take the first step.",               author: "Martin Luther King Jr." },
  { text: "Small daily improvements are the key to staggering long-term results.",              author: ""                     },
  { text: "It's not about having time. It's about making time.",                                author: ""                     },
  { text: "Clarity about what matters provides clarity about what does not.",                   author: "Cal Newport"          },
  { text: "The most productive people work on the right things.",                               author: ""                     },
]

function LoadingScreen() {
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f1011',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 40,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes loading-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-shine {
          0%   { transform: translateX(-140%) skewX(-18deg); }
          100% { transform: translateX(260%)  skewX(-18deg); }
        }
      `}</style>

      {/* Logo + wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, animation: 'loading-in 0.55s ease-out both' }}>
        {/* Logo with shine sweep */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '6px 8px', '--wt-text': 'rgba(255,255,255,0.92)' } as React.CSSProperties}>
          <Logo size={68} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
            animation: 'logo-shine 2.8s ease-in-out infinite',
            animationDelay: '0.6s',
          }} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px' }}>
          wiigit
        </span>
      </div>

      {/* Quote */}
      <div style={{
        maxWidth: 380, textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: 10,
        animation: 'loading-in 0.55s ease-out 0.25s both',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
          "{quote.text}"
        </p>
        {quote.author && (
          <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 500 }}>
            — {quote.author}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Returns true when the user has no real content — only system boards exist
 * and no user board has any widgets. This indicates a brand-new account.
 */
function isFirstRun(): boolean {
  return !localStorage.getItem('onboarding-complete')
}

export function AuthGuard({ children }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const { init, isLoading, boards } = useWhiteboardStore()
  const initTheme = useThemeStore((s) => s.init)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [templatePickerDismissed, setTemplatePickerDismissed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        const uid = data.session.user.id
        analytics.identify(uid, { email: data.session.user.email })
        Promise.all([init(uid), initTheme(uid)]).then(() => {
          startBoardSync(uid)
          startThemeSync(uid)
          startRealtimeSync(uid)
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session) {
        const uid = session.user.id
        analytics.identify(uid, { email: session.user.email })
        const state = useWhiteboardStore.getState()
        if (state.userId === uid && state.boards.length > 0) {
          // Already initialised for this user (e.g. tab regained focus) — just restart syncs
          startBoardSync(uid)
          startThemeSync(uid)
          startRealtimeSync(uid)
        } else {
          Promise.all([init(uid), initTheme(uid)]).then(() => {
            startBoardSync(uid)
            startThemeSync(uid)
            startRealtimeSync(uid)
          })
        }
      }
      if (event === 'SIGNED_OUT') {
        analytics.reset()
        stopBoardSync()
        stopThemeSync()
        stopRealtimeSync()
        localStorage.removeItem('onboarding-complete')
        setTemplatePickerDismissed(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for first-run after loading completes
  useEffect(() => {
    if (!isLoading && session && !templatePickerDismissed && isFirstRun()) {
      setShowTemplatePicker(true)
    }
  }, [isLoading, session, boards, templatePickerDismissed])

  if (session === undefined) return <LoadingScreen />
  if (!session) return <LoginScreen />
  if (isLoading) return <LoadingScreen />

  if (showTemplatePicker) {
    return (
      <TemplatePicker
        onComplete={() => {
          localStorage.setItem('onboarding-complete', '1')
          setShowTemplatePicker(false)
          setTemplatePickerDismissed(true)
        }}
      />
    )
  }

  return <>{children}</>
}
