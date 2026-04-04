import { google } from 'googleapis'
import Anthropic from '@anthropic-ai/sdk'
import type { Client } from '@notionhq/client'
import { loadMemory } from './memory.js'
import { getGCalClient } from './gcal.js'
import { getCachedSchema } from './schema-cache.js'

export async function compileBriefing(notion: Client): Promise<string> {
  const mem    = loadMemory()
  const now    = new Date()
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const parts: string[] = []

  // Weather — geocode via open-meteo
  try {
    const loc = mem.location || 'Jersey City'
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1`).then(r => r.json()) as any
    const { latitude, longitude } = geo.results?.[0] ?? { latitude: 40.7178, longitude: -74.0431 }
    const wx = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph`
    ).then(r => r.json()) as any
    const temp = Math.round(wx.current?.temperature_2m ?? 0)
    const code = wx.current?.weathercode ?? 0
    const desc = code <= 1 ? 'clear' : code <= 3 ? 'partly cloudy' : code <= 48 ? 'foggy' : code <= 67 ? 'rainy' : code <= 77 ? 'snowy' : 'stormy'
    parts.push(`Weather in ${loc}: ${temp}°F and ${desc}.`)
  } catch { /* skip */ }

  // Google Calendar — today's events
  try {
    const client = getGCalClient()
    if (client) {
      const cal = google.calendar({ version: 'v3', auth: client as any })
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
      const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999)
      const resp = await cal.events.list({
        calendarId:   'primary',
        timeMin:      startOfDay.toISOString(),
        timeMax:      endOfDay.toISOString(),
        singleEvents: true,
        orderBy:      'startTime',
        maxResults:   10,
      })
      const events = (resp.data.items ?? []).map((e: any) => {
        const start = e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'all day'
        return `${start}: ${e.summary}`
      })
      if (events.length) parts.push(`Today's calendar: ${events.join(', ')}.`)
      else               parts.push('No calendar events today.')
    }
  } catch { /* skip */ }

  // Notion tasks — use first known database
  try {
    const dbEntries = Object.entries(mem.databases)
    const taskDb    = dbEntries.find(([k]) => /task|todo|to-do/i.test(k)) ?? dbEntries[0]
    if (taskDb) {
      const [label, dbId] = taskDb
      const props      = await getCachedSchema(notion, dbId)
      const statusProp = props.find(p => p.type === 'status' || p.type === 'select')
      const titleProp  = props.find(p => p.type === 'title')?.name ?? 'Name'
      const doneOpts   = ['Done','Completed','Complete','Closed','Archived']
      const doneOpt    = (statusProp?.options ?? []).find((o: string) => doneOpts.includes(o))
      const filter     = statusProp && doneOpt
        ? { property: statusProp.name, [statusProp.type]: { does_not_equal: doneOpt } }
        : undefined
      const resp   = await notion.databases.query({ database_id: dbId, filter, page_size: 5 })
      const titles = (resp.results as any[]).map(p => {
        const arr = p.properties?.[titleProp]?.title as any[]
        return arr?.map((t: any) => t.plain_text).join('') ?? ''
      }).filter(Boolean)
      if (titles.length) parts.push(`Open ${label} (${titles.length}): ${titles.join(', ')}.`)
    }
  } catch { /* skip */ }

  // Sports — Man United + Islanders last result
  try {
    const muRes  = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/360/schedule`).then(r => r.json()) as any
    const lastMU = (muRes.events ?? []).filter((e: any) => e.competitions?.[0]?.status?.type?.completed).slice(-1)[0]
    if (lastMU) {
      const comp = lastMU.competitions?.[0]
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
      parts.push(`Manchester United last result: ${home?.team?.shortDisplayName} ${home?.score} – ${away?.score} ${away?.team?.shortDisplayName}.`)
    }
  } catch { /* skip */ }

  try {
    const islRes  = await fetch(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/19/schedule`).then(r => r.json()) as any
    const lastIsl = (islRes.events ?? []).filter((e: any) => e.competitions?.[0]?.status?.type?.completed).slice(-1)[0]
    if (lastIsl) {
      const comp = lastIsl.competitions?.[0]
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')
      parts.push(`Islanders last result: ${home?.team?.shortDisplayName} ${home?.score} – ${away?.score} ${away?.team?.shortDisplayName}.`)
    }
  } catch { /* skip */ }

  const anthropic = new Anthropic({ apiKey })
  const dayStr    = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeStr   = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const name      = mem.name || 'Dylan'
  const dataBlock = parts.length ? parts.join('\n') : 'No data available.'

  const resp = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:     'You are Walli, a smart whiteboard assistant. Write a warm, natural, spoken morning briefing — 2 to 4 sentences max. No bullet points, no markdown. Sound like a helpful assistant, not a robot.',
    messages:   [{
      role:    'user',
      content: `Today is ${dayStr}, ${timeStr}. User's name: ${name}.\n\nData:\n${dataBlock}\n\nWrite the morning briefing.`,
    }],
  })
  return (resp.content[0] as Anthropic.TextBlock).text.trim()
}
