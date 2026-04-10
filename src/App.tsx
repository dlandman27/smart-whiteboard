import { useEffect } from 'react'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { Whiteboard } from './components/Whiteboard'
import { AuthGuard } from './components/AuthGuard'
import { KioskGuard } from './components/KioskGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useThemeStore } from './store/theme'
import { useNotificationStore } from './store/notifications'

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
      staleTime: 10_000,
    },
  },
})

function ThemeApplier() {
  const applyToDOM = useThemeStore((s) => s.applyToDOM)
  useEffect(() => { applyToDOM() }, [applyToDOM])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeApplier />
        <AuthGuard>
          <KioskGuard>
            <Whiteboard />
          </KioskGuard>
        </AuthGuard>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
