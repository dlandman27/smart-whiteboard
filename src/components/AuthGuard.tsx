import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useWhiteboardStore } from '../store/whiteboard'
import { useThemeStore } from '../store/theme'
import { startBoardSync, stopBoardSync } from '../lib/syncBoards'
import { startThemeSync, stopThemeSync } from '../lib/syncTheme'
import { startRealtimeSync, stopRealtimeSync } from '../lib/realtimeSync'
import { LoginScreen } from './LoginScreen'
import { TemplatePicker } from './TemplatePicker'

interface Props {
  children: React.ReactNode
}

// Skeleton that mimics the app layout: sidebar + board area
function LoadingSkeleton() {
  const shimmer = `
    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
  `
  const skeletonBar = (w: string | number, h: number, mb = 0): React.CSSProperties => ({
    width: w, height: h, borderRadius: 8, marginBottom: mb,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', background: '#1a1b1e' }}>
      <style>{shimmer}</style>

      {/* Skeleton sidebar */}
      <div style={{
        width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column',
        padding: '16px 12px', gap: 8, borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, paddingLeft: 4 }}>
          <div style={skeletonBar(20, 20)} />
          <div style={skeletonBar(70, 14)} />
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

        {/* Nav items */}
        <div style={skeletonBar('100%', 36, 4)} />
        <div style={skeletonBar('100%', 36, 4)} />
        <div style={skeletonBar('100%', 36, 4)} />

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />

        {/* Board items */}
        <div style={{ ...skeletonBar(60, 10), marginBottom: 8 }} />
        <div style={skeletonBar('100%', 34, 4)} />
        <div style={skeletonBar('100%', 34, 4)} />
        <div style={skeletonBar('100%', 34, 4)} />
      </div>

      {/* Skeleton board area */}
      <div style={{ flex: 1, padding: 8 }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12,
        }}>
          {/* Widget skeletons */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
            <div style={skeletonBar(260, 160)} />
            <div style={skeletonBar(260, 160)} />
            <div style={skeletonBar(260, 120)} />
            <div style={skeletonBar(180, 120)} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Returns true when the user has no real content — only system boards exist
 * and no user board has any widgets. This indicates a brand-new account.
 */
function isFirstRun(boards: ReturnType<typeof useWhiteboardStore.getState>['boards']): boolean {
  const userBoards = boards.filter((b) => !b.boardType)
  // No user boards at all, or all user boards are empty
  return userBoards.every((b) => b.widgets.length === 0)
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
        Promise.all([init(uid), initTheme(uid)]).then(() => {
          startBoardSync(uid)
          startThemeSync(uid)
          startRealtimeSync(uid)
        })
      }
      if (event === 'SIGNED_OUT') {
        stopBoardSync()
        stopThemeSync()
        stopRealtimeSync()
        setTemplatePickerDismissed(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for first-run after loading completes
  useEffect(() => {
    if (!isLoading && session && !templatePickerDismissed && isFirstRun(boards)) {
      setShowTemplatePicker(true)
    }
  }, [isLoading, session, boards, templatePickerDismissed])

  if (session === undefined) return <LoadingSkeleton />
  if (!session) return <LoginScreen />
  if (isLoading) return <LoadingSkeleton />

  if (showTemplatePicker) {
    return (
      <TemplatePicker
        onComplete={() => {
          setShowTemplatePicker(false)
          setTemplatePickerDismissed(true)
        }}
      />
    )
  }

  return <>{children}</>
}
