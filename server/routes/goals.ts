import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase.js'
import { AppError, asyncRoute } from '../middleware/error.js'
import type {
  Goal,
  GoalMilestone,
  GoalProgressLog,
  HabitCheckin,
  GoalLink,
  GoalType,
  GoalStatus,
  ProgressMode,
  Frequency,
  LinkType,
} from '../types/goals.js'

const VALID_TYPES:       GoalType[]     = ['numeric', 'average', 'habit', 'milestone']
const VALID_STATUSES:    GoalStatus[]   = ['active', 'completed', 'archived']
const VALID_MODES:       ProgressMode[] = ['additive', 'snapshot']
const VALID_FREQUENCIES: Frequency[]   = ['daily', 'weekdays', 'weekends', '2x_week', '3x_week']
const VALID_LINK_TYPES:  LinkType[]    = ['routine', 'task_list']

export function goalsRouter(): Router {
  const router = Router()

  // ── List goals (with milestones and links) ────────────────────────────────

  router.get('/goals', asyncRoute(async (req, res) => {
    const { status, type } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('goals')
      .select('*, milestones:goal_milestones(*), links:goal_links(*)')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (type)   query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch goals: ${error.message}`)

    res.json(data)
  }))

  // ── Create goal ───────────────────────────────────────────────────────────

  router.post('/goals', asyncRoute(async (req, res) => {
    const {
      title,
      description,
      type,
      start_value,
      target_value,
      unit,
      progress_mode,
      milestone_step,
      frequency,
      start_date,
      target_date,
      color,
      emoji,
      data_source,
      data_source_metric,
    } = req.body as Partial<Goal>

    if (!title?.trim())                    throw new AppError(400, 'title is required')
    if (!type)                             throw new AppError(400, 'type is required')
    if (!VALID_TYPES.includes(type))       throw new AppError(400, `type must be one of: ${VALID_TYPES.join(', ')}`)
    if (progress_mode && !VALID_MODES.includes(progress_mode)) {
      throw new AppError(400, `progress_mode must be one of: ${VALID_MODES.join(', ')}`)
    }
    if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
      throw new AppError(400, `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
    }

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id:            req.userId!,
        title:              title.trim(),
        description:        description ?? null,
        type,
        status:             'active',
        start_value:        start_value  ?? null,
        target_value:       target_value ?? null,
        current_value:      start_value  ?? 0,
        unit:               unit         ?? null,
        progress_mode:      progress_mode ?? 'snapshot',
        milestone_step:     milestone_step ?? null,
        frequency:          frequency    ?? null,
        start_date:         start_date   ?? null,
        target_date:        target_date  ?? null,
        color:              color        ?? null,
        emoji:              emoji        ?? null,
        data_source:        data_source  ?? 'manual',
        data_source_metric: data_source_metric ?? null,
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to create goal: ${error.message}`)

    // Auto-generate threshold milestones from milestone_step
    if (milestone_step && start_value != null && target_value != null) {
      const step      = Number(milestone_step)
      const start     = Number(start_value)
      const end       = Number(target_value)
      const direction = start < end ? 1 : -1
      const thresholds: number[] = []

      let v = start + direction * step
      while (direction === 1 ? v <= end : v >= end) {
        thresholds.push(v)
        v += direction * step
      }
      if (thresholds.length === 0 || thresholds[thresholds.length - 1] !== end) {
        thresholds.push(end)
      }

      const inserts = thresholds.map((thresh, i) => ({
        goal_id:      data.id,
        user_id:      req.userId!,
        title:        unit ? `${thresh} ${unit}` : String(thresh),
        target_value: thresh,
        sort_order:   i,
      }))

      await supabaseAdmin.from('goal_milestones').insert(inserts)
    }

    res.status(201).json(data)
  }))

  // ── Update goal ───────────────────────────────────────────────────────────

  router.patch('/goals/:id', asyncRoute(async (req, res) => {
    const { id } = req.params
    const updates: Record<string, unknown> = { ...req.body }

    if (updates.type && !VALID_TYPES.includes(updates.type as GoalType)) {
      throw new AppError(400, `type must be one of: ${VALID_TYPES.join(', ')}`)
    }
    if (updates.status && !VALID_STATUSES.includes(updates.status as GoalStatus)) {
      throw new AppError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    if (updates.progress_mode && !VALID_MODES.includes(updates.progress_mode as ProgressMode)) {
      throw new AppError(400, `progress_mode must be one of: ${VALID_MODES.join(', ')}`)
    }
    if (typeof updates.title === 'string') {
      updates.title = updates.title.trim()
      if (!updates.title) throw new AppError(400, 'title cannot be empty')
    }

    delete updates.user_id
    delete updates.id
    delete updates.created_at
    delete updates.updated_at

    const { data, error } = await supabaseAdmin
      .from('goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to update goal: ${error.message}`)
    if (!data)  throw new AppError(404, 'Goal not found')

    res.json(data)
  }))

  // ── Delete goal ───────────────────────────────────────────────────────────

  router.delete('/goals/:id', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete goal: ${error.message}`)

    res.json({ ok: true })
  }))

  // ── List milestones ───────────────────────────────────────────────────────

  router.get('/goals/:id/milestones', asyncRoute(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', req.params.id)
      .eq('user_id', req.userId!)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new AppError(500, `Failed to fetch milestones: ${error.message}`)

    res.json(data)
  }))

  // ── Create milestone ──────────────────────────────────────────────────────

  router.post('/goals/:id/milestones', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { title, target_value } = req.body as Partial<GoalMilestone>

    if (!title?.trim()) throw new AppError(400, 'title is required')

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')

    // Auto-increment sort_order
    const { data: maxRow } = await supabaseAdmin
      .from('goal_milestones')
      .select('sort_order')
      .eq('goal_id', goal_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sort_order = (maxRow?.sort_order ?? -1) + 1

    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .insert({
        goal_id,
        user_id:      req.userId!,
        title:        title.trim(),
        target_value: target_value ?? null,
        sort_order,
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to create milestone: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Update milestone ──────────────────────────────────────────────────────

  router.patch('/goals/:id/milestones/:milestoneId', asyncRoute(async (req, res) => {
    const { milestoneId } = req.params
    const updates: Record<string, unknown> = { ...req.body }

    if (typeof updates.title === 'string') {
      updates.title = updates.title.trim()
      if (!updates.title) throw new AppError(400, 'title cannot be empty')
    }

    delete updates.user_id
    delete updates.id
    delete updates.goal_id
    delete updates.created_at

    const { data, error } = await supabaseAdmin
      .from('goal_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to update milestone: ${error.message}`)
    if (!data)  throw new AppError(404, 'Milestone not found')

    res.json(data)
  }))

  // ── Delete milestone ──────────────────────────────────────────────────────

  router.delete('/goals/:id/milestones/:milestoneId', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goal_milestones')
      .delete()
      .eq('id', req.params.milestoneId)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete milestone: ${error.message}`)

    res.json({ ok: true })
  }))

  // ── Log progress (numeric + average) ─────────────────────────────────────

  router.post('/goals/:id/progress', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { value, note, logged_at } = req.body as Partial<GoalProgressLog>

    if (value === undefined || value === null) throw new AppError(400, 'value is required')
    if (typeof value !== 'number')             throw new AppError(400, 'value must be a number')

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id, type')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')
    if (!['numeric', 'average'].includes(goal.type)) {
      throw new AppError(400, `Progress logs are only for numeric and average goals`)
    }

    const { data, error } = await supabaseAdmin
      .from('goal_progress_logs')
      .insert({
        goal_id,
        user_id:   req.userId!,
        value,
        note:      note      ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to log progress: ${error.message}`)

    // current_value is updated by the goal_progress_sync DB trigger

    res.status(201).json(data)
  }))

  // ── Get progress history ──────────────────────────────────────────────────

  router.get('/goals/:id/progress', asyncRoute(async (req, res) => {
    const { limit } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('goal_progress_logs')
      .select('*')
      .eq('goal_id', req.params.id)
      .eq('user_id', req.userId!)
      .order('logged_at', { ascending: false })

    if (limit) query = query.limit(Number(limit))

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch progress: ${error.message}`)

    res.json(data)
  }))

  // ── Habit check-in ────────────────────────────────────────────────────────

  router.post('/goals/:id/checkin', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { note, checked_on } = req.body as { note?: string; checked_on?: string }

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id, type')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')
    if (goal.type !== 'habit')  throw new AppError(400, 'Check-ins are only for habit goals')

    const date = checked_on ?? new Date().toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('habit_checkins')
      .upsert(
        { goal_id, user_id: req.userId!, checked_on: date, note: note ?? null },
        { onConflict: 'goal_id,user_id,checked_on' },
      )
      .select()
      .single()

    if (error) throw new AppError(500, `Failed to check in: ${error.message}`)

    res.status(201).json(data)
  }))

  // ── Undo habit check-in ───────────────────────────────────────────────────

  router.delete('/goals/:id/checkin/:date', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('habit_checkins')
      .delete()
      .eq('goal_id', req.params.id)
      .eq('user_id', req.userId!)
      .eq('checked_on', req.params.date)

    if (error) throw new AppError(500, `Failed to undo check-in: ${error.message}`)

    res.json({ ok: true })
  }))

  // ── List habit check-ins ──────────────────────────────────────────────────

  router.get('/goals/:id/checkins', asyncRoute(async (req, res) => {
    const { limit } = req.query as Record<string, string>

    let query = supabaseAdmin
      .from('habit_checkins')
      .select('*')
      .eq('goal_id', req.params.id)
      .eq('user_id', req.userId!)
      .order('checked_on', { ascending: false })

    if (limit) query = query.limit(Number(limit))

    const { data, error } = await query
    if (error) throw new AppError(500, `Failed to fetch checkins: ${error.message}`)

    res.json(data)
  }))

  // ── Add link ──────────────────────────────────────────────────────────────

  router.post('/goals/:id/links', asyncRoute(async (req, res) => {
    const { id: goal_id } = req.params
    const { linked_type, linked_id } = req.body as Partial<GoalLink>

    if (!linked_type) throw new AppError(400, 'linked_type is required')
    if (!linked_id)   throw new AppError(400, 'linked_id is required')
    if (!VALID_LINK_TYPES.includes(linked_type as LinkType)) {
      throw new AppError(400, `linked_type must be one of: ${VALID_LINK_TYPES.join(', ')}`)
    }

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', req.userId!)
      .single()

    if (goalError || !goal) throw new AppError(404, 'Goal not found')

    const { data, error } = await supabaseAdmin
      .from('goal_links')
      .insert({ goal_id, user_id: req.userId!, linked_type, linked_id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new AppError(409, 'This link already exists')
      throw new AppError(500, `Failed to create link: ${error.message}`)
    }

    res.status(201).json(data)
  }))

  // ── Remove link ───────────────────────────────────────────────────────────

  router.delete('/goals/:id/links/:linkId', asyncRoute(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('goal_links')
      .delete()
      .eq('id', req.params.linkId)
      .eq('user_id', req.userId!)

    if (error) throw new AppError(500, `Failed to delete link: ${error.message}`)

    res.json({ ok: true })
  }))

  // ── Parse natural language goal description ───────────────────────────────

  router.post('/goals/parse', asyncRoute(async (req, res) => {
    const { messages } = req.body as {
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!messages?.length) throw new AppError(400, 'messages is required')

    const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new AppError(500, 'ANTHROPIC_API_KEY not configured')

    const anthropic = new Anthropic({ apiKey })
    const today = new Date().toISOString().slice(0, 10)

    const system = `You are helping a user create a personal goal. Today is ${today}.

FIRST: decide if you have enough information. If not, ask ONE short, friendly clarifying question.
Return: {"type":"question","question":"..."}

WHEN TO ASK:
- For numeric snapshot goals (weight loss, debt payoff, savings, strength), you need both start_value and target_value. Figure out what you already know:
  • User gives a delta only ("lose 30 lbs", "save $5k") → you know the amount to change but not the starting point. Ask ONLY for the current value: "What's your current weight?" Then compute target = start ± delta.
  • User gives start + target ("go from 200 to 150 lbs") → you have both. No need to ask.
  • User gives start + delta ("I'm 220 lbs and want to lose 30") → compute target=190. No need to ask.
  • User gives only target ("get to 150 lbs") → ask for current value only.
  • User gives neither → ask for both in one question.
- For additive goals (run 500 miles, read 24 books), start_value is 0 — no need to ask.
- For habit and milestone goals, no numeric values needed unless the user mentions them.
- If the goal type itself is unclear, ask to clarify the intent.
- Do NOT ask about things you can reasonably infer (deadline, emoji, color, milestone cadence).

Once you have enough information, return a fully-structured goal.
Return: {"type":"goal","data":{...}}

The goal data object must have:
- type: "numeric" | "average" | "habit" | "milestone"
- title: string (concise, max 50 chars)
- description: string | null
- emoji: string (single emoji)
- color: one of "#3b82f6"|"#8b5cf6"|"#f97316"|"#10b981"|"#ec4899"|"#f59e0b"|"#06b6d4"|"#ef4444"
- start_value: number | null
- target_value: number | null (numeric/average only)
- unit: string | null (e.g. "lbs", "books", "km" — null for habit/milestone)
- progress_mode: "additive" | "snapshot"
  • additive: each log ADDS to the total (miles run, books read, money saved incrementally)
  • snapshot: each log REPLACES current value (bodyweight, account balance, bench press max)
- milestone_step: number | null (auto-generate milestones every N units — e.g. 10 for every 10 lbs)
- frequency: "daily"|"weekdays"|"weekends"|"2x_week"|"3x_week"|null (habit goals only)
- target_date: string | null (ISO date YYYY-MM-DD if mentioned, else null)
- milestones: string[] (2–5 named checkpoints for milestone goals, [] otherwise)

Goal type rules:
- numeric: measurable quantity with a fixed target to hit (weight loss, books read, money saved, bench press)
- average: ongoing metric to maintain over time, no fixed endpoint (sleep hours, daily steps, calories)
- habit: recurring behavior on a schedule (meditate daily, gym 3x/week, journal every morning)
- milestone: project with discrete named steps (launch app, plan wedding, get certified)

progress_mode rules:
- additive: accumulation goals where each entry adds to the total (miles run, books read)
- snapshot: measurement goals where each entry replaces the current value (bodyweight, debt balance, max lift)
- average goals are always snapshot

start_value for snapshot numeric goals:
- This is the user's current measurement — required to compute progress % correctly
- "lose 30 lbs" → delta=30, start unknown → ask "What's your current weight?" → set target = start - 30
- "lose 30 lbs, I'm 220" → start=220, target=190 → no need to ask
- "go from 200 to 150 lbs" → start=200, target=150 → no need to ask
- "get to 150 lbs" → target=150, start unknown → ask "What's your current weight?"
- "pay off $8k in debt" → target=0, start unknown → ask "What's your current balance?"
- Additive goals (run 500 miles, read 24 books): start_value=0, no need to ask

Color guidance: health/fitness=green, money=teal, creativity=purple, energy=orange, love=pink, learning=blue.
Return raw JSON only — no markdown, no explanation.`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages,
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new AppError(500, 'Failed to parse AI response')
    }

    res.json(parsed)
  }))

  return router
}
