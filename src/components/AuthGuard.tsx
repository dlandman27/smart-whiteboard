import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useWhiteboardStore } from '../store/whiteboard'
import { LoginScreen } from './LoginScreen'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const [session,    setSession]    = useState<Session | null | undefined>(undefined)
  const { init, isLoading } = useWhiteboardStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) init(data.session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session) init(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null   // checking session
  if (!session) return <LoginScreen />
  if (isLoading) return null               // loading boards from Supabase

  return <>{children}</>
}
