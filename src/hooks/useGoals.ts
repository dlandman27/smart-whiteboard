import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

// ── Types (aligned with server/types/goals.ts) ────────────────────────────────

export type GoalType   = 'numeric' | 'habit' | 'time_based' | 'milestone'
export type GoalStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id:            string
  user_id:       string
  title:         string
  description:   string | null
  type:          GoalType
  status:        GoalStatus
  target_value:  number | null
  current_value: number
  unit:          string | null
  start_date:    string | null
  target_date:   string | null
  color:         string | null
  emoji:         string | null
  created_at:    string
  updated_at:    string
}

export interface GoalMilestone {
  id:           string
  goal_id:      string
  user_id:      string
  title:        string
  target_value: number | null
  completed_at: string | null
  sort_order:   number
  created_at:   string
}

export interface GoalLink {
  id:          string
  goal_id:     string
  user_id:     string
  linked_type: string
  linked_id:   string
  created_at:  string
}

export interface GoalProgressLog {
  id:        string
  goal_id:   string
  user_id:   string
  value:     number
  note:      string | null
  logged_at: string
}

export interface GoalWithRelations extends Goal {
  milestones: GoalMilestone[]
  links:      GoalLink[]
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGoals(status?: string) {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  return useQuery<GoalWithRelations[]>({
    queryKey:  ['goals', status ?? 'all'],
    queryFn:   () => apiFetch(`/api/goals${params}`),
    staleTime: 60_000,
  })
}

export function useGoalProgress(goalId: string) {
  return useQuery<GoalProgressLog[]>({
    queryKey:  ['goal-progress', goalId],
    queryFn:   () => apiFetch(`/api/goals/${goalId}/progress?limit=30`),
    staleTime: 30_000,
    enabled:   !!goalId,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

type CreateGoalBody = Pick<Goal, 'title' | 'type'> & Partial<Pick<Goal,
  'description' | 'target_value' | 'unit' | 'start_date' | 'target_date' | 'color' | 'emoji'
>>

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateGoalBody) =>
      apiFetch<Goal>('/api/goals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Goal> & { id: string }) =>
      apiFetch<Goal>(`/api/goals/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useLogProgress(goalId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ value, note }: { value: number; note?: string }) =>
      apiFetch<GoalProgressLog>(`/api/goals/${goalId}/progress`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ value, note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['goal-progress', goalId] })
    },
  })
}

// ── Milestone mutations ───────────────────────────────────────────────────────

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, title, target_value }: { goalId: string; title: string; target_value?: number }) =>
      apiFetch<GoalMilestone>(`/api/goals/${goalId}/milestones`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, target_value }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      goalId,
      milestoneId,
      ...body
    }: { goalId: string; milestoneId: string } & Partial<GoalMilestone>) =>
      apiFetch<GoalMilestone>(`/api/goals/${goalId}/milestones/${milestoneId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
      apiFetch(`/api/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
