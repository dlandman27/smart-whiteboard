import { useEffect } from 'react'
import { QueryClient, QueryClientProvider, MutationCache, useQueryClient } from '@tanstack/react-query'
import { Whiteboard } from './components/Whiteboard'
import { AuthGuard } from './components/AuthGuard'
import { KioskGuard } from './components/KioskGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useThemeStore } from './store/theme'
import { useNotificationStore } from './store/notifications'
import { apiFetch } from './lib/apiFetch'

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      useNotificationStore.getState().addNotification({
        title: 'Action failed',
        body:  error instanceof Error ? error.message : 'Something went wrong',
        type:  'error',
      })
    },
  }),
  defaultOptions: {
    queries: {
      retry:     1,
      staleTime: 3 * 60_000,   // 3 minutes — avoids refetch on every mount
      gcTime:    10 * 60_000,  // 10 minutes — keep unused data in memory
    },
  },
})

function ThemeApplier() {
  const applyToDOM = useThemeStore((s) => s.applyToDOM)
  useEffect(() => { applyToDOM() }, [applyToDOM])
  return null
}

function AppPrefetcher() {
  const qc = useQueryClient()
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    qc.prefetchQuery({ queryKey: ['goals', 'active'],            queryFn: () => apiFetch('/api/goals?status=active') })
    qc.prefetchQuery({ queryKey: ['routines'],                   queryFn: () => apiFetch('/api/routines') })
    qc.prefetchQuery({ queryKey: ['routine-completions', today], queryFn: () => apiFetch(`/api/routines/completions?date=${today}`) })
    qc.prefetchQuery({ queryKey: ['wiigit-tasks', 'all'],        queryFn: () => apiFetch('/api/tasks') })
  }, [qc])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeApplier />
        <AppPrefetcher />
        <AuthGuard>
          <KioskGuard>
            <Whiteboard />
          </KioskGuard>
        </AuthGuard>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
