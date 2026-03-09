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

export function useArchivePage(databaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pageId: string) => apiFetch(`/api/pages/${pageId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages', databaseId] }),
  })
}
