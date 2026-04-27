import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export interface WiigitTask {
  id:           string
  title:        string
  notes:        string | null
  status:       'needsAction' | 'completed'
  priority:     1 | 2 | 3 | 4
  due:          string | null
  list_name:    string
  completed_at: string | null
  created_at:   string
}

export function useWiigitTasks(listName?: string) {
  const params = listName ? `?list_name=${encodeURIComponent(listName)}` : ''
  return useQuery<WiigitTask[]>({
    queryKey: ['wiigit-tasks', listName ?? 'all'],
    queryFn:  () => apiFetch(`/api/tasks${params}`),
  })
}

export function useToggleWiigitTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiFetch(`/api/tasks/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: completed ? 'needsAction' : 'completed' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiigit-tasks'] })
    },
  })
}

export function useCreateWiigitTask(listName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      apiFetch('/api/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, list_name: listName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiigit-tasks'] })
    },
  })
}
