import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getEventProviders } from '../providers'
import type { UnifiedEvent, SourceGroup } from '../types/unified'

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches events from all connected event providers within a time window,
 * merged into a single list. One provider failing does not break the others.
 *
 * Visibility filtering is done client-side so toggling calendars is instant.
 *
 * @param timeMin       ISO-8601 start of the window
 * @param timeMax       ISO-8601 end of the window
 * @param visibleGroups Optional filter — keys like "builtin:Work" or "gcal:Personal"
 */
export function useUnifiedEvents(
  timeMin: string,
  timeMax: string,
  visibleGroups?: Set<string>,
) {
  const providers = getEventProviders()

  const query = useQuery({
    queryKey: ['unified-events', timeMin, timeMax],
    queryFn: async () => {
      const results = await Promise.allSettled(
        providers.map(p => p.fetchEvents(timeMin, timeMax)),
      )

      return results
        .filter(
          (r): r is PromiseFulfilledResult<UnifiedEvent[]> =>
            r.status === 'fulfilled',
        )
        .flatMap(r => r.value)
    },
    enabled: !!(timeMin && timeMax),
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

  // Filter client-side — no refetch when visibility changes
  const data = useMemo(() => {
    if (!query.data) return undefined
    if (!visibleGroups || visibleGroups.size === 0) return query.data
    return query.data.filter(e =>
      visibleGroups.has(`${e.source.provider}:${e.groupName}`),
    )
  }, [query.data, visibleGroups])

  return { ...query, data }
}

/**
 * Fetches event groups (calendars / feeds) from every connected event provider,
 * annotated with provider metadata so the UI can render grouped selectors.
 */
export function useEventGroups() {
  const providers = getEventProviders()

  return useQuery({
    queryKey: ['unified-event-groups'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        providers.map(async p => {
            const groups = await p.fetchGroups()
            return groups.map(g => ({
              ...g,
              key: `${p.id}:${g.groupName}`,
              providerId: p.id,
              providerLabel: p.label,
              providerIcon: p.icon,
            }))
          }),
      )

      return results
        .filter(
          (r): r is PromiseFulfilledResult<
            (SourceGroup & {
              providerId: string
              providerLabel: string
              providerIcon: string
            })[]
          > => r.status === 'fulfilled',
        )
        .flatMap(r => r.value)
    },
  })
}
