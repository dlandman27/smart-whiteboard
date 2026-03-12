import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Whiteboard } from './components/Whiteboard'
import { KioskGuard } from './components/KioskGuard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KioskGuard>
        <Whiteboard />
      </KioskGuard>
    </QueryClientProvider>
  )
}
