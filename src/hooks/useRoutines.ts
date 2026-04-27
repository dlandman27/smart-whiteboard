import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export interface Routine {
  id:         string
  title:      string
  category:   'morning' | 'daily' | 'evening'
  emoji:      string
  sort_order: number
  enabled:    boolean
  created_at: string
}

const TODAY = () => new Date().toISOString().slice(0, 10)

export function useRoutines() {
  return useQuery<Routine[]>({
    queryKey: ['routines'],
    queryFn:  () => apiFetch('/api/routines'),
  })
}

export function useRoutineCompletions(date?: string) {
  const d = date ?? TODAY()
  return useQuery<string[]>({
    queryKey: ['routine-completions', d],
    queryFn:  () => apiFetch(`/api/routines/completions?date=${d}`),
  })
}

export function useToggleRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed, date }: { id: string; completed: boolean; date?: string }) => {
      const d = date ?? TODAY()
      if (completed) {
        return apiFetch(`/api/routines/${id}/complete`, {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }).then(() => ({ id, completed: false, date: d }))
      }
      return apiFetch(`/api/routines/${id}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: d }),
      })
    },
    onMutate: async ({ id, completed, date }) => {
      const d = date ?? TODAY()
      const key = ['routine-completions', d]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<string[]>(key) ?? []
      qc.setQueryData<string[]>(key, completed ? prev.filter(x => x !== id) : [...prev, id])
      return { prev, key }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: (_d, _e, { date }) => {
      qc.invalidateQueries({ queryKey: ['routine-completions', date ?? TODAY()] })
    },
  })
}

export function useCreateRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Pick<Routine, 'title' | 'category' | 'emoji'>) =>
      apiFetch<Routine>('/api/routines', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}

export function useUpdateRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Routine> & { id: string }) =>
      apiFetch<Routine>(`/api/routines/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}

export function useDeleteRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/routines/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}

export function useReorderRoutines() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/api/routines/reorder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  })
}
