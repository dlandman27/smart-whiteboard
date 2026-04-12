import { useQuery } from '@tanstack/react-query'
import { getTaskProviders } from '../providers'
import type { UnifiedTask, SourceGroup } from '../types/unified'

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches tasks from all connected task providers, merged into a single list.
 * One provider failing does not break the others (Promise.allSettled).
 *
 * @param visibleGroups  Optional filter — keys like "builtin:My Tasks" or "gtasks:Shopping List"
 */
export function useUnifiedTasks(visibleGroups?: Set<string>) {
  const providers = getTaskProviders()

  return useQuery({
    queryKey: [
      'unified-tasks',
      Array.from(visibleGroups ?? []).sort().join(','),
    ],
    queryFn: async () => {
      const results = await Promise.allSettled(
        providers.map(p => p.fetchTasks()),
      )

      let tasks = results
        .filter(
          (r): r is PromiseFulfilledResult<UnifiedTask[]> =>
            r.status === 'fulfilled',
        )
        .flatMap(r => r.value)

      if (visibleGroups && visibleGroups.size > 0) {
        tasks = tasks.filter(t =>
          visibleGroups.has(`${t.source.provider}:${t.groupName}`),
        )
      }

      return tasks
    },
    refetchInterval: 60_000,
  })
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
