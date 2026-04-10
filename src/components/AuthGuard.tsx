import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useWhiteboardStore } from '../store/whiteboard'
import { useThemeStore } from '../store/theme'
import { startBoardSync, stopBoardSync } from '../lib/syncBoards'
import { startThemeSync, stopThemeSync } from '../lib/syncTheme'
import { startRealtimeSync, stopRealtimeSync } from '../lib/realtimeSync'
import { LoginScreen } from './LoginScreen'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const { init, isLoading } = useWhiteboardStore()
  const initTheme = useThemeStore((s) => s.init)

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
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null   // checking session
  if (!session) return <LoginScreen />
  if (isLoading) return null               // loading boards from Supabase

  return <>{children}</>
}
