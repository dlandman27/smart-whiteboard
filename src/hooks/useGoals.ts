import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export type GoalType     = 'numeric' | 'average' | 'habit' | 'milestone'
export type GoalStatus   = 'active' | 'completed' | 'archived'
export type ProgressMode = 'additive' | 'snapshot'
export type Frequency    = 'daily' | 'weekdays' | 'weekends' | '2x_week' | '3x_week'

export interface Goal {
  id:                  string
  title:               string
  description:         string | null
  type:                GoalType
  status:              GoalStatus
  emoji:               string
  color:               string
  // Numeric / average fields
  start_value:         number | null
  target_value:        number | null
  current_value:       number
  unit:                string | null
  progress_mode:       ProgressMode
  milestone_step:      number | null
  // Habit fields
  frequency:           Frequency | null
  // Dates
  start_date:          string | null
  target_date:         string | null
  // Data source
  data_source:         string
  data_source_metric:  string | null
  created_at:          string
  updated_at:          string
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

export interface HabitCheckin {
  id:         string
  goal_id:    string
  user_id:    string
  checked_on: string   // YYYY-MM-DD
  note:       string | null
  created_at: string
}

export type GoalWithRelations = Goal & {
  milestones: GoalMilestone[]
  links:      unknown[]
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function useGoals(status: GoalStatus = 'active') {
  return useQuery<GoalWithRelations[]>({
    queryKey: ['goals', status],
    queryFn:  () => apiFetch(`/api/goals?status=${status}`),
  })
}

export function useGoalMilestones(goalId: string | null) {
  return useQuery<GoalMilestone[]>({
    queryKey: ['goal-milestones', goalId],
    queryFn:  () => apiFetch(`/api/goals/${goalId}/milestones`),
    enabled:  !!goalId,
  })
}

export function useHabitCheckins(goalId: string | null, limit = 60) {
  return useQuery<HabitCheckin[]>({
    queryKey: ['habit-checkins', goalId],
    queryFn:  () => apiFetch(`/api/goals/${goalId}/checkins?limit=${limit}`),
    enabled:  !!goalId,
  })
}

// ── Streak helper (daily only for now) ────────────────────────────────────────

export function computeStreak(checkins: HabitCheckin[]): number {
  if (checkins.length === 0) return 0

  const today     = new Date().toISOString().slice(0, 10)
  const dates     = new Set(checkins.map(c => c.checked_on))
  let streak      = 0
  let current     = today

  while (dates.has(current)) {
    streak++
    const d = new Date(current)
    d.setDate(d.getDate() - 1)
    current = d.toISOString().slice(0, 10)
  }

  // If not checked in today, count from yesterday's streak
  if (!dates.has(today)) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    current = yesterday.toISOString().slice(0, 10)
    streak  = 0
    while (dates.has(current)) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = d.toISOString().slice(0, 10)
    }
  }

  return streak
}

// ── Progress % (handles start_value + direction) ───────────────────────────────

export function computeProgressPct(goal: Goal): number {
  if (goal.target_value == null) return 0
  const start   = goal.start_value ?? 0
  const target  = goal.target_value
  const current = goal.current_value

  if (start === target) return 0

  if (start > target) {
    // Going down (weight loss, debt payoff)
    return Math.min(Math.max((start - current) / (start - target), 0), 1)
  } else {
    // Going up (savings, miles, books)
    return Math.min(Math.max((current - start) / (target - start), 0), 1)
  }
}

// ── Create ─────────────────────────────────────────────────────────────────────

export type CreateGoalInput = Pick<Goal, 'title' | 'type' | 'emoji' | 'color'> &
  Partial<Pick<Goal,
    | 'description' | 'start_value' | 'target_value' | 'unit'
    | 'progress_mode' | 'milestone_step' | 'frequency'
    | 'start_date' | 'target_date' | 'data_source' | 'data_source_metric'
  >>

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

// ── Habit check-ins ────────────────────────────────────────────────────────────

export function useCheckinHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, note }: { goalId: string; note?: string }) =>
      apiFetch<HabitCheckin>(`/api/goals/${goalId}/checkin`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note }),
      }),
    onSuccess: (_data, { goalId }) =>
      qc.invalidateQueries({ queryKey: ['habit-checkins', goalId] }),
  })
}

export function useUncheckinHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, date }: { goalId: string; date: string }) =>
      apiFetch(`/api/goals/${goalId}/checkin/${date}`, { method: 'DELETE' }),
    onSuccess: (_data, { goalId }) =>
      qc.invalidateQueries({ queryKey: ['habit-checkins', goalId] }),
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
    mutationFn: ({ goalId, milestoneId, title, completed_at }: {
      goalId: string; milestoneId: string; title?: string; completed_at?: string | null
    }) =>
      apiFetch<GoalMilestone>(`/api/goals/${goalId}/milestones/${milestoneId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, completed_at }),
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

// ── Parse natural language ─────────────────────────────────────────────────────

export interface ParsedGoal {
  type:           GoalType
  title:          string
  description:    string | null
  emoji:          string
  color:          string
  start_value:    number | null
  target_value:   number | null
  unit:           string | null
  progress_mode:  ProgressMode
  milestone_step: number | null
  frequency:      Frequency | null
  target_date:    string | null
  milestones:     string[]
}

export type ParseMessage = { role: 'user' | 'assistant'; content: string }

export type ParseResponse =
  | { type: 'question'; question: string }
  | { type: 'goal'; data: ParsedGoal }

export function useParseGoal() {
  return useMutation({
    mutationFn: (messages: ParseMessage[]) =>
      apiFetch<ParseResponse>('/api/goals/parse', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages }),
      }),
  })
}
