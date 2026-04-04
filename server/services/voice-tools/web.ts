import { canvas, ordinal, leagueLabel } from '../board-utils.js'
import { log } from '../../lib/logger.js'
import type { VoiceTool } from './_types.js'

export const webTools: VoiceTool[] = [
  {
    definition: {
      name:        'web_search',
      description: 'Search the internet via Brave Search for current information — scores, standings, news, weather, facts, prices, etc. Use this when you need live data or when the user asks about something you may not know. Returns titles, snippets, and URLs from the top results.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query, e.g. "Premier League table 2025" or "Manchester United next match"' },
        },
        required: ['query'],
      },
    },
    execute: async (input) => {
      const braveKey = process.env.VITE_BRAVE_SEARCH_API_KEY ?? process.env.BRAVE_SEARCH_API_KEY
                    ?? process.env.VITE_BING_SEARCH_API_KEY  ?? process.env.BING_SEARCH_API_KEY
      if (!braveKey) return 'Web search unavailable: BRAVE_SEARCH_API_KEY not set'
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=5`,
        { headers: { 'Accept': 'application/json', 'X-Subscription-Token': braveKey } },
      )
      const body = await r.text()
      log(`[brave] status=${r.status} body=${body.slice(0, 300)}`)
      if (!r.ok) return `Search failed: ${r.status} — ${body.slice(0, 200)}`
      const data = JSON.parse(body) as any
      const results = (data.web?.results ?? []).map((v: any) => ({
        title:   v.title,
        snippet: v.description,
        url:     v.url,
      }))
      return JSON.stringify(results)
    },
  },

  {
    definition: {
      name:        'fetch_page',
      description: 'Fetch the text content of a webpage. Use this after web_search to read the actual content of a result URL and extract useful information from it.',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: { type: 'string', description: 'Full URL to fetch' },
        },
        required: ['url'],
      },
    },
    execute: async (input) => {
      try {
        const r = await fetch(input.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Walli/1.0)' },
        })
        if (!r.ok) return `Failed to fetch page: ${r.status}`
        const html = await r.text()
        const raw = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        const limit = 5000
        const text = raw.length <= limit ? raw : raw.slice(0, limit).replace(/[^.!?]*$/, '')
        return text
      } catch (e) {
        return `Could not fetch page: ${String(e)}`
      }
    },
  },

  {
    definition: {
      name:        'get_standings',
      description: 'Get the current league standings/table for a football (soccer) league. Use this for any question about league positions, points, or tables. Supported leagues: premierleague, laliga, bundesliga, seriea, ligue1, ucl, mls.',
      input_schema: {
        type: 'object' as const,
        properties: {
          league:  { type: 'string', description: 'League key, e.g. "premierleague", "laliga"' },
          team:    { type: 'string', description: 'Optional: filter to a specific team name to answer positional questions' },
          display: { type: 'boolean', description: 'If true, create an HTML widget showing the full table. If false, just return the data to answer a spoken question.' },
        },
        required: ['league'],
      },
    },
    execute: async (input) => {
      const { league, team, display } = input as { league: string; team?: string; display?: boolean }
      const port = Number(process.env.PORT) || 3001
      const r    = await fetch(`http://localhost:${port}/api/standings/${league}`)
      if (!r.ok) return `Could not fetch standings for ${league}`
      const { table } = await r.json() as { table: any[] }

      if (team) {
        const row = table.find((t) => t.team.toLowerCase().includes(team.toLowerCase()))
        if (!row) return `${team} not found in ${league} standings`
        return `${row.team} are ${row.pos}${ordinal(row.pos)} with ${row.pts} points from ${row.gp} games (${row.w}W ${row.d}D ${row.l}L, GD ${row.gd})`
      }

      if (display) {
        const rows = table.map((t) =>
          `<tr><td>${t.pos}</td><td class="team">${t.team}</td><td>${t.gp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gd}</td><td class="pts">${t.pts}</td></tr>`
        ).join('')
        const html = `<style>
          body{font-family:system-ui,sans-serif;padding:12px;background:transparent;color:#e2e8f0}
          table{width:100%;border-collapse:collapse;font-size:13px}
          th{text-align:center;padding:6px 4px;border-bottom:2px solid #334155;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase}
          th.team-h{text-align:left}
          td{text-align:center;padding:5px 4px;border-bottom:1px solid #1e293b}
          td.team{text-align:left;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
          td.pts{font-weight:700;color:#38bdf8}
          tr:hover td{background:#1e293b}
        </style>
        <table>
          <thead><tr><th>#</th><th class="team-h">Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
        const { id } = canvas.createWidget({
          widgetType: '@whiteboard/html',
          width: 480, height: 600,
          label: leagueLabel(league),
          settings: { html, title: leagueLabel(league) },
        })
        return `Displayed ${leagueLabel(league)} table (widget id: ${id})`
      }

      return JSON.stringify(table)
    },
  },
]
