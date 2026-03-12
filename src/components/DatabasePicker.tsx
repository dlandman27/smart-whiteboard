import { useMemo, useState } from 'react'
import { Database, X, AlertCircle, Calendar, ExternalLink, Search } from 'lucide-react'
import { STATIC_WIDGETS } from './widgets/registry'
import { Icon, IconButton, Text } from '../ui/web'
import { useNotionDatabases, useNotionHealth } from '../hooks/useNotion'
import { useGCalStatus, useGCalCalendars } from '../hooks/useGCal'
import { useWhiteboardStore } from '../store/whiteboard'

interface Props {
  onClose: () => void
}

function dbTitle(db: any): string {
  return db.title?.map((t: any) => t.plain_text).join('') || 'Untitled'
}

// ── Widget option types ───────────────────────────────────────────────────────

import type { StaticWidgetDef } from './widgets/registry'

type WidgetOption =
  | { kind: 'static'; def: StaticWidgetDef }
  | { kind: 'notion'; db: any }
  | { kind: 'calendar'; cal: { id: string; summary: string; backgroundColor?: string } }

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Icon icon={Search} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
      <input
        autoFocus
        type="text"
        placeholder="Search widgets…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-3 py-2 text-sm text-stone-700 placeholder-stone-300 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-stone-400 transition-colors"
      />
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-1 pt-3 pb-1 text-xs font-semibold text-stone-400 uppercase tracking-wide first:pt-1">
      {label}
    </p>
  )
}

function WidgetRow({
  icon,
  iconBg,
  iconColor,
  label,
  badge,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor?: string
  label: string
  badge?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
    >
      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}
        style={iconColor ? { background: iconColor } : undefined}
      >
        {icon}
      </div>
      <Text as="span" variant="body" size="medium" className="flex-1 truncate">{label}</Text>
      {badge && <Text as="span" variant="caption" color="muted" className="flex-shrink-0">{badge}</Text>}
    </button>
  )
}

function NotionSetupNotice() {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
      <Icon icon={AlertCircle} size={14} className="flex-shrink-0 mt-0.5" />
      <Text as="span" variant="caption">NOTION_API_KEY is not set. Copy .env.example to .env and restart the server.</Text>
    </div>
  )
}

function GCalSetupNotice() {
  return (
    <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 space-y-2">
      <Text variant="label">Google Calendar setup required</Text>
      <ol className="list-decimal list-inside space-y-1 text-stone-500">
        <li>Enable the Google Calendar API in Google Cloud Console</li>
        <li>Create an OAuth 2.0 Web Client credential</li>
        <li>Add redirect URI: <code className="bg-stone-100 px-1 rounded">http://localhost:3001/api/gcal/callback</code></li>
        <li>Add <code className="bg-stone-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-stone-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> to .env</li>
      </ol>
    </div>
  )
}

function GCalConnectPrompt() {
  return (
    <div className="p-4 flex flex-col items-center gap-3 bg-stone-50 rounded-xl border border-stone-200">
      <Icon icon={Calendar} size={28} className="text-stone-400" />
      <Text variant="body" align="center" className="text-stone-600">Connect your Google account to add calendar widgets</Text>
      <button
        onClick={() => window.open('http://localhost:3001/api/gcal/auth', '_blank', 'width=500,height=600')}
        className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <Icon icon={ExternalLink} size={13} /> Connect Google Calendar
      </button>
      <Text variant="caption" color="muted" align="center">A popup will open for Google sign-in.</Text>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DatabasePicker({ onClose }: Props) {
  const [query, setQuery] = useState('')

  const health  = useNotionHealth()
  const { data: notionData, isLoading: notionLoading } = useNotionDatabases()
  const gcalStatus = useGCalStatus()
  const { data: calData, isLoading: calLoading } = useGCalCalendars()

  const { boards, activeBoardId, addWidget } = useWhiteboardStore()
  const widgets = boards.find((b) => b.id === activeBoardId)?.widgets ?? []

  const notionConfigured = health.data?.configured
  const gcalConfigured   = gcalStatus.data?.configured
  const gcalConnected    = gcalStatus.data?.connected

  // Build flat list of all available widget options
  const allOptions = useMemo<WidgetOption[]>(() => {
    const opts: WidgetOption[] = STATIC_WIDGETS.map((def) => ({ kind: 'static' as const, def }))
    notionData?.results?.forEach((db: any) => opts.push({ kind: 'notion', db }))
    calData?.items?.forEach((cal: any) => opts.push({ kind: 'calendar', cal }))
    return opts
  }, [notionData, calData])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? allOptions.filter((o) => {
        if (o.kind === 'static')   return o.def.keywords.some((kw) => kw.includes(q) || q.includes(kw))
        if (o.kind === 'notion')   return dbTitle(o.db).toLowerCase().includes(q) || 'notion'.includes(q)
        if (o.kind === 'calendar') return o.cal.summary.toLowerCase().includes(q) || 'calendar'.includes(q)
        return false
      })
    : allOptions

  function handleAdd(option: WidgetOption) {
    const offset = widgets.length * 24
    if (option.kind === 'static') {
      const { type, label, defaultSize } = option.def
      addWidget({ type, databaseTitle: label, x: 60 + offset, y: 60 + offset, ...defaultSize })
    } else if (option.kind === 'notion') {
      addWidget({ type: 'database', databaseId: option.db.id, databaseTitle: dbTitle(option.db), x: 60 + offset, y: 60 + offset, width: 500, height: 380 })
    } else if (option.kind === 'calendar') {
      addWidget({ type: 'calendar', calendarId: option.cal.id, databaseTitle: option.cal.summary, x: 60 + offset, y: 60 + offset, width: 380, height: 460 })
    }
    onClose()
  }

  const staticOptions   = filtered.filter((o): o is Extract<WidgetOption, { kind: 'static' }>   => o.kind === 'static')
  const notionOptions   = filtered.filter((o): o is Extract<WidgetOption, { kind: 'notion' }>   => o.kind === 'notion')
  const calendarOptions = filtered.filter((o): o is Extract<WidgetOption, { kind: 'calendar' }> => o.kind === 'calendar')

  const isLoading  = notionLoading || calLoading
  const hasResults = staticOptions.length + notionOptions.length + calendarOptions.length > 0

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div
        className="fixed bottom-20 left-1/2 z-40 slide-up bg-white border border-stone-200 rounded-2xl shadow-2xl w-96 max-h-[560px] flex flex-col"
        style={{ transform: 'translateX(-50%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <Text variant="title" size="small">Add Widget</Text>
          <IconButton icon={X} onClick={onClose} />
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <SearchBar value={query} onChange={setQuery} />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">

          {/* Setup notices (only shown when not searching) */}
          {!q && !notionConfigured && (
            <div className="mb-2"><NotionSetupNotice /></div>
          )}
          {!q && gcalConfigured && !gcalConnected && (
            <div className="mb-2"><GCalConnectPrompt /></div>
          )}
          {!q && !gcalConfigured && (
            <div className="mb-2"><GCalSetupNotice /></div>
          )}

          {/* Utilities section */}
          {staticOptions.length > 0 && (
            <>
              <SectionLabel label="Utilities" />
              {staticOptions.map((o) => {
                const alreadyAdded = widgets.some((w) => w.type === o.def.type)
                return (
                  <WidgetRow
                    key={o.def.type}
                    icon={<Icon icon={o.def.Icon} size={14} className={o.def.iconClass} />}
                    iconBg={o.def.iconBg}
                    label={o.def.label}
                    badge={alreadyAdded ? 'On board' : undefined}
                    disabled={alreadyAdded}
                    onClick={() => handleAdd(o)}
                  />
                )
              })}
            </>
          )}

          {/* Notion section */}
          {notionOptions.length > 0 && (
            <>
              <SectionLabel label="Notion" />
              {notionOptions.map((o) => {
                const added = widgets.some((w) => w.databaseId === o.db.id)
                return (
                  <WidgetRow
                    key={o.db.id}
                    icon={<Icon icon={Database} size={14} className="text-blue-500" />}
                    iconBg="bg-stone-100"
                    label={dbTitle(o.db)}
                    badge={added ? 'On board' : undefined}
                    disabled={added}
                    onClick={() => handleAdd(o)}
                  />
                )
              })}
            </>
          )}

          {/* Google Calendar section */}
          {calendarOptions.length > 0 && (
            <>
              <SectionLabel label="Google Calendar" />
              {calendarOptions.map((o) => {
                const added = widgets.some((w) => w.calendarId === o.cal.id)
                return (
                  <WidgetRow
                    key={o.cal.id}
                    icon={<Icon icon={Calendar} size={14} className="text-white" />}
                    iconBg=""
                    iconColor={o.cal.backgroundColor ?? '#4285f4'}
                    label={o.cal.summary}
                    badge={added ? 'On board' : undefined}
                    disabled={added}
                    onClick={() => handleAdd(o)}
                  />
                )
              })}
            </>
          )}

          {/* Loading */}
          {isLoading && !hasResults && (
            <Text color="muted" align="center" className="py-8">Loading…</Text>
          )}

          {/* No results */}
          {q && !hasResults && !isLoading && (
            <div className="py-8 text-center">
              <Text color="muted">No widgets match &ldquo;{query}&rdquo;</Text>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
