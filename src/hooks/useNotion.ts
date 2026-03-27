import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useNotionHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<{ ok: boolean; configured: boolean }>('/api/health'),
    retry: false,
  })
}

export function useNotionDatabases() {
  return useQuery({
    queryKey: ['databases'],
    queryFn: () => apiFetch<{ results: any[] }>('/api/databases'),
  })
}

export function useNotionPages(databaseId: string) {
  return useQuery({
    queryKey: ['pages', databaseId],
    queryFn: () =>
      apiFetch<{ results: any[] }>(`/api/databases/${databaseId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_size: 50 }),
      }),
    enabled: !!databaseId,
    refetchInterval: 30_000,
  })
}

export function useWeightLog(databaseId: string) {
  return useQuery({
    queryKey: ['weight-log', databaseId],
    queryFn: () =>
      apiFetch<{ results: any[] }>(`/api/databases/${databaseId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sorts: [{ property: 'Date', direction: 'ascending' }],
          page_size: 100,
        }),
      }),
    enabled: !!databaseId,
    refetchInterval: 60_000,
  })
}

export function useUpdatePage(databaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pageId, properties }: { pageId: string; properties: Record<string, unknown> }) =>
      apiFetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages', databaseId] }),
  })
}

export function useCreatePage(databaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (properties: Record<string, unknown>) =>
      apiFetch(`/api/databases/${databaseId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages', databaseId] }),
  })
}

export function usePageBlocks(pageId: string) {
  return useQuery({
    queryKey: ['blocks', pageId],
    queryFn: () => apiFetch<{ results: any[] }>(`/api/pages/${pageId}/blocks`),
    enabled: !!pageId,
    refetchInterval: 30_000,
  })
}

export function useUpdateBlock(pageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ blockId, data }: { blockId: string; data: Record<string, unknown> }) =>
      apiFetch(`/api/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onMutate: async ({ blockId, data }) => {
      await qc.cancelQueries({ queryKey: ['blocks', pageId] })
      const prev = qc.getQueryData<{ results: any[] }>(['blocks', pageId])
      if (prev) {
        qc.setQueryData(['blocks', pageId], {
          ...prev,
          results: prev.results.map((b) =>
            b.id === blockId ? { ...b, to_do: { ...b.to_do, ...(data.to_do as object) } } : b
          ),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['blocks', pageId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['blocks', pageId] }),
  })
}

export function useArchivePage(databaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pageId: string) => apiFetch(`/api/pages/${pageId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages', databaseId] }),
  })
}
