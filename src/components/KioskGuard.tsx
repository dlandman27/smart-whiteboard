import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useKioskRefresh } from '../hooks/useKioskRefresh'
import { NetworkStatusBanner } from './NetworkStatusBanner'

interface Props {
  children: React.ReactNode
}

export function KioskGuard({ children }: Props) {
  const isOnline = useNetworkStatus()
  const queryClient = useQueryClient()
  useKioskRefresh()

  // Refetch all active queries when the network comes back
  useEffect(() => {
    if (isOnline) {
      queryClient.refetchQueries()
    }
  }, [isOnline, queryClient])

  return (
    <>
      {!isOnline && <NetworkStatusBanner />}
      {children}
    </>
  )
}
