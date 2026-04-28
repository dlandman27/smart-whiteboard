import { supabaseAdmin } from '../lib/supabase.js'

export interface WalliProfile {
  id:                    string
  user_id:               string
  preferred_name:        string | null
  life_focus:            string[]
  tendencies:            string[]
  motivation_style:      string | null
  about:                 string | null
  coaching_style:        'gentle' | 'balanced' | 'direct'
  checkin_frequency:     'low' | 'normal' | 'high'
  synthesized_context:   string | null
  context_updated_at:    string | null
  onboarding_completed:  boolean
}

export interface WalliObservation {
  id:          string
  type:        string
  content:     string
  source:      string
  confidence:  number
  observed_at: string
}

// ── Fetch profile ─────────────────────────────────────────────────────────────

export async function getWalliProfile(userId: string): Promise<WalliProfile | null> {
  const { data } = await supabaseAdmin
    .from('walli_profile')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data ?? null
}

export async function upsertWalliProfile(userId: string, patch: Partial<WalliProfile>): Promise<WalliProfile> {
  const { data, error } = await supabaseAdmin
    .from('walli_profile')
    .upsert({ ...patch, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw new Error(`Failed to upsert walli profile: ${error.message}`)
  return data
}

// ── Log observation ───────────────────────────────────────────────────────────

export async function logObservation(
  userId: string,
  obs: Pick<WalliObservation, 'type' | 'content' | 'source' | 'confidence'>
): Promise<void> {
  await supabaseAdmin.from('walli_observations').insert({ ...obs, user_id: userId })
}

// ── Build context document ────────────────────────────────────────────────────
// Assembles everything Walli needs before an interaction into a single string.
// Injected into Walli's system prompt.

export async function buildWalliContext(userId: string): Promise<string> {
  const [profile, observations, goals, routineStats] = await Promise.all([
    getWalliProfile(userId),
    getRecentObservations(userId),
    getActiveGoalsSummary(userId),
    getRoutineStats(userId),
  ])

  const parts: string[] = []

  // ── Identity ─────────────────────────────────────────────────────────────────
  const name = profile?.preferred_name ?? 'the user'
  parts.push(`## About ${name}`)

  if (profile?.about) {
    parts.push(profile.about)
  }

  if (profile?.life_focus?.length) {
    parts.push(`Currently focused on: ${profile.life_focus.join(', ')}.`)
  }

  if (profile?.tendencies?.length) {
    parts.push(`Known tendencies: ${profile.tendencies.join(', ')}.`)
  }

  if (profile?.motivation_style) {
    parts.push(`Most motivated by: ${profile.motivation_style}.`)
  }

  // ── Coaching style ────────────────────────────────────────────────────────────
  parts.push(`\n## How to coach ${name}`)
  const styleGuide: Record<string, string> = {
    gentle:   'Be warm and encouraging. Avoid pressure. Nudge softly.',
    balanced: 'Mix warmth with directness. Push when needed but read the room.',
    direct:   'Be straight. No fluff. Call things out clearly and move on.',
  }
  parts.push(styleGuide[profile?.coaching_style ?? 'balanced'])

  const freqGuide: Record<string, string> = {
    low:    'Check in sparingly — only when something important comes up.',
    normal: 'Check in at natural moments — morning, after tasks, when patterns emerge.',
    high:   'Stay engaged. Frequent check-ins are welcome.',
  }
  parts.push(freqGuide[profile?.checkin_frequency ?? 'normal'])

  // ── Active goals ──────────────────────────────────────────────────────────────
  if (goals.length > 0) {
    parts.push(`\n## Current Goals`)
    for (const g of goals) {
      const progress = g.target_value
        ? ` (${g.current_value}/${g.target_value}${g.unit ? ' ' + g.unit : ''})`
        : ''
      parts.push(`- ${g.emoji ?? '🎯'} ${g.title}${progress}`)
    }
  }

  // ── Routine stats ─────────────────────────────────────────────────────────────
  if (routineStats) {
    parts.push(`\n## Routine Patterns (last 7 days)`)
    parts.push(`Overall completion: ${routineStats.pct}%`)
    if (routineStats.strongPeriods.length)
      parts.push(`Strong: ${routineStats.strongPeriods.join(', ')}`)
    if (routineStats.weakPeriods.length)
      parts.push(`Struggling with: ${routineStats.weakPeriods.join(', ')}`)
  }

  // ── Walli's synthesized model ─────────────────────────────────────────────────
  if (profile?.synthesized_context) {
    parts.push(`\n## Walli's Working Model`)
    parts.push(profile.synthesized_context)
  }

  // ── Recent observations ───────────────────────────────────────────────────────
  if (observations.length > 0) {
    parts.push(`\n## Recent Observations`)
    for (const o of observations) {
      parts.push(`- [${o.type}] ${o.content}`)
    }
  }

  return parts.join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRecentObservations(userId: string): Promise<WalliObservation[]> {
  const { data } = await supabaseAdmin
    .from('walli_observations')
    .select('*')
    .eq('user_id', userId)
    .order('observed_at', { ascending: false })
    .limit(20)
  return data ?? []
}

async function getActiveGoalsSummary(userId: string) {
  const { data } = await supabaseAdmin
    .from('goals')
    .select('title, emoji, type, current_value, target_value, unit')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

async function getRoutineStats(userId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const since = sevenDaysAgo.toISOString().slice(0, 10)

  const [routinesRes, completionsRes] = await Promise.all([
    supabaseAdmin.from('routines').select('id, category').eq('user_id', userId).eq('enabled', true),
    supabaseAdmin.from('routine_completions').select('routine_id').eq('user_id', userId).gte('completed_date', since),
  ])

  const routines    = routinesRes.data ?? []
  const completions = completionsRes.data ?? []
  if (routines.length === 0) return null

  const completedIds = new Set(completions.map(c => c.routine_id))

  // Per-period breakdown
  const periods = ['morning', 'daily', 'evening'] as const
  const byPeriod: Record<string, { total: number; done: number }> = {}

  for (const p of periods) {
    const inPeriod = routines.filter(r => r.category === p)
    const doneInPeriod = inPeriod.filter(r => completedIds.has(r.id))
    byPeriod[p] = { total: inPeriod.length * 7, done: doneInPeriod.size }
  }

  const totalPossible = routines.length * 7
  const totalDone     = completions.length
  const pct           = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

  const strongPeriods = periods.filter(p => {
    const s = byPeriod[p]
    return s.total > 0 && s.done / s.total >= 0.7
  })
  const weakPeriods = periods.filter(p => {
    const s = byPeriod[p]
    return s.total > 0 && s.done / s.total < 0.4
  })

  return { pct, strongPeriods, weakPeriods }
}
