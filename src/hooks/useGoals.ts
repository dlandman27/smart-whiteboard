import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export type GoalType   = 'numeric' | 'habit' | 'time_based' | 'milestone'
export type GoalStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id:            string
  title:         string
  description:   string | null
  type:          GoalType
  status:        GoalStatus
  emoji:         string
  color:         string
  target_value:  number | null
  current_value: number
  target_date:   string | null
  created_at:    string
  updated_at:    string
}

export interface GoalMilestone {
  id:          string
  goal_id:     string
  title:       string
  completed:   boolean
  sort_order:  number
  created_at:  string
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function useGoals(status: GoalStatus = 'active') {
  return useQuery<Goal[]>({
    queryKey:  ['goals', status],
    queryFn:   () => apiFetch(`/api/goals?status=${status}`),
    staleTime: 60_000,
  })
}

export function useGoalMilestones(goalId: string | null) {
  return useQuery<GoalMilestone[]>({
    queryKey:  ['goal-milestones', goalId],
    queryFn:   () => apiFetch(`/api/goals/${goalId}/milestones`),
    enabled:   !!goalId,
    staleTime: 60_000,
  })
}

// ── Create ─────────────────────────────────────────────────────────────────────

export type CreateGoalInput = Pick<Goal, 'title' | 'type' | 'emoji' | 'color'> &
  Partial<Pick<Goal, 'description' | 'target_value' | 'target_date'>>

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateGoalInput) =>
      apiFetch<Goal>('/api/goals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ── Update ─────────────────────────────────────────────────────────────────────

export type UpdateGoalInput = Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>> & { id: string }

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateGoalInput) =>
      apiFetch<Goal>(`/api/goals/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ── Log progress ───────────────────────────────────────────────────────────────

export function useLogProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value, note }: { id: string; value: number; note?: string }) =>
      apiFetch(`/api/goals/${id}/progress`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ value, note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ── Milestones ─────────────────────────────────────────────────────────────────

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, title }: { goalId: string; title: string }) =>
      apiFetch<GoalMilestone>(`/api/goals/${goalId}/milestones`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title }),
      }),
    onSuccess: (_data, { goalId }) => qc.invalidateQueries({ queryKey: ['goal-milestones', goalId] }),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, milestoneId, title, completed }: {
      goalId: string; milestoneId: string; title?: string; completed?: boolean
    }) =>
      apiFetch<GoalMilestone>(`/api/goals/${goalId}/milestones/${milestoneId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, completed }),
      }),
    onSuccess: (_data, { goalId }) => qc.invalidateQueries({ queryKey: ['goal-milestones', goalId] }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
      apiFetch(`/api/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' }),
    onSuccess: (_data, { goalId }) => qc.invalidateQueries({ queryKey: ['goal-milestones', goalId] }),
  })
}
