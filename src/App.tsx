import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Whiteboard } from './components/Whiteboard'
import { KioskGuard } from './components/KioskGuard'
import { useThemeStore } from './store/theme'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <KioskGuard>
        <Whiteboard />
      </KioskGuard>
    </QueryClientProvider>
  )
}
