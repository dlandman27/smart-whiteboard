import { useState } from 'react'
import { Database, X, AlertCircle, Calendar, ExternalLink } from 'lucide-react'
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

export function DatabasePicker({ onClose }: Props) {
  const health    = useNotionHealth()
  const { data: notionData, isLoading: notionLoading, error: notionError } = useNotionDatabases()
  const gcalStatus  = useGCalStatus()
  const { data: calData, isLoading: calLoading } = useGCalCalendars()

  const { boards, activeBoardId, addWidget } = useWhiteboardStore()
  const widgets = boards.find((b) => b.id === activeBoardId)?.widgets ?? []

  const [tab, setTab] = useState<'notion' | 'calendar'>('notion')

  function handleAddNotion(db: any) {
    const title = dbTitle(db)
    const offset = widgets.length * 24
    addWidget({
      type: 'database',
      databaseId: db.id,
      databaseTitle: title,
      x: 60 + offset, y: 60 + offset, width: 500, height: 380,
    })
    onClose()
  }

  function handleAddCalendar(cal: { id: string; summary: string }) {
    const offset = widgets.length * 24
    addWidget({
      type: 'calendar',
      calendarId: cal.id,
      databaseTitle: cal.summary,
      x: 60 + offset, y: 60 + offset, width: 380, height: 460,
    })
    onClose()
  }

  function openAuth() {
    window.open('http://localhost:3001/api/gcal/auth', '_blank', 'width=500,height=600')
  }

  const notionConfigured = health.data?.configured

  return (
    <>
      {/* Transparent backdrop for click-outside */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div
        className="fixed bottom-20 left-1/2 z-40 slide-up bg-white border border-stone-200 rounded-2xl shadow-2xl w-96 max-h-[520px] flex flex-col"
        style={{ transform: 'translateX(-50%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <Text variant="title" size="small">Add Widget</Text>
          <IconButton icon={X} onClick={onClose} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          <button
            onClick={() => setTab('notion')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-b-2 ${
              tab === 'notion' ? 'border-stone-700 text-stone-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            <Icon icon={Database} size={13} /> Notion
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-b-2 ${
              tab === 'calendar' ? 'border-stone-700 text-stone-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            <Icon icon={Calendar} size={13} /> Google Calendar
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">

          {/* ── Notion tab ── */}
          {tab === 'notion' && (
            <>
              {!notionConfigured && (
                <div className="flex items-start gap-2 m-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                  <Icon icon={AlertCircle} size={14} className="flex-shrink-0 mt-0.5" />
                  <Text as="span" variant="caption">NOTION_API_KEY is not set. Copy .env.example to .env and restart the server.</Text>
                </div>
              )}
              {notionLoading && <Text color="muted" align="center" className="py-8">Loading databases…</Text>}
              {notionError && (
                <div className="text-center py-8 px-4">
                  <Text variant="label" className="text-red-500">Could not load databases</Text>
                  <Text variant="caption" className="text-red-400 mt-1">{(notionError as Error).message}</Text>
                </div>
              )}
              {notionData?.results?.length === 0 && (
                <Text color="muted" align="center" className="py-8 px-4">
                  No databases found. Share at least one database with your integration in Notion.
                </Text>
              )}
              {notionData?.results?.map((db: any) => {
                const title = dbTitle(db)
                const added = widgets.some((w) => w.databaseId === db.id)
                return (
                  <button
                    key={db.id}
                    onClick={() => !added && handleAddNotion(db)}
                    disabled={added}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <Icon icon={Database} size={14} className="text-blue-500" />
                    </div>
                    <Text as="span" variant="body" size="medium" className="flex-1 truncate">{title}</Text>
                    {added && <Text as="span" variant="caption" color="muted" className="flex-shrink-0">On board</Text>}
                  </button>
                )
              })}
            </>
          )}

          {/* ── Google Calendar tab ── */}
          {tab === 'calendar' && (
            <>
              {!gcalStatus.data?.configured && (
                <div className="m-2 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 space-y-2">
                  <Text variant="label">Setup required</Text>
                  <ol className="list-decimal list-inside space-y-1 text-stone-500">
                    <li>Go to Google Cloud Console → APIs &amp; Services</li>
                    <li>Enable the Google Calendar API</li>
                    <li>Create an OAuth 2.0 Web Client credential</li>
                    <li>Add redirect URI: <code className="bg-stone-100 px-1 rounded">http://localhost:3001/api/gcal/callback</code></li>
                    <li>Add <code className="bg-stone-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-stone-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> to .env and restart</li>
                  </ol>
                </div>
              )}

              {gcalStatus.data?.configured && !gcalStatus.data?.connected && (
                <div className="m-2 p-4 flex flex-col items-center gap-3 bg-stone-50 rounded-xl border border-stone-200">
                  <Icon icon={Calendar} size={28} className="text-stone-400" />
                  <Text variant="body" align="center" className="text-stone-600">Connect your Google account to add calendar widgets</Text>
                  <button
                    onClick={openAuth}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Icon icon={ExternalLink} size={13} /> Connect Google Calendar
                  </button>
                  <Text variant="caption" color="muted" align="center">A popup will open for Google sign-in. This page will update automatically once authorized.</Text>
                </div>
              )}

              {gcalStatus.data?.connected && (
                <>
                  {calLoading && <Text color="muted" align="center" className="py-8">Loading calendars…</Text>}
                  {calData?.items?.map((cal) => {
                    const added = widgets.some((w) => w.calendarId === cal.id)
                    return (
                      <button
                        key={cal.id}
                        onClick={() => !added && handleAddCalendar(cal)}
                        disabled={added}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: cal.backgroundColor ?? '#4285f4' }}
                        >
                          <Icon icon={Calendar} size={14} className="text-white" />
                        </div>
                        <Text as="span" variant="body" size="medium" className="flex-1 truncate">{cal.summary}</Text>
                        {added && <Text as="span" variant="caption" color="muted" className="flex-shrink-0">On board</Text>}
                      </button>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
