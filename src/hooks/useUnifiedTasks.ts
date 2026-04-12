import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getTaskProviders } from '../providers'
import type { UnifiedTask, SourceGroup } from '../types/unified'

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches tasks from all connected task providers, merged into a single list.
 * One provider failing does not break the others (Promise.allSettled).
 *
 * Visibility and completed filtering is done client-side so toggling is instant.
 */
export function useUnifiedTasks(visibleGroups?: Set<string>, showCompleted?: boolean) {
  const providers = getTaskProviders()

  const query = useQuery({
    queryKey: ['unified-tasks'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        providers.map(p => p.fetchTasks()),
      )

      return results
        .filter(
          (r): r is PromiseFulfilledResult<UnifiedTask[]> =>
            r.status === 'fulfilled',
        )
        .flatMap(r => r.value)
    },
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })

  // Filter client-side — no refetch when visibility or showCompleted changes
  const data = useMemo(() => {
    if (!query.data) return undefined
    let tasks = query.data

    if (visibleGroups && visibleGroups.size > 0) {
      tasks = tasks.filter(t =>
        visibleGroups.has(`${t.source.provider}:${t.groupName}`),
      )
    }

    if (!showCompleted) {
      tasks = tasks.filter(t => !t.completed)
    }

    return tasks
  }, [query.data, visibleGroups, showCompleted])

  return { ...query, data }
}

/**
 * Fetches task groups (lists / projects) from every connected task provider,
 * annotated with provider metadata so the UI can render grouped selectors.
 */
export function useTaskGroups() {
  const providers = getTaskProviders()

  return useQuery({
    queryKey: ['unified-task-groups'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        providers
          .map(async p => {
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
