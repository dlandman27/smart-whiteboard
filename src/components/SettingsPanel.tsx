import { X, ExternalLink } from 'lucide-react'
import { IconButton, Text } from '../ui/web'
import { BACKGROUNDS, type Background } from '../constants/backgrounds'
import { useNotionHealth } from '../hooks/useNotion'
import { useGCalStatus } from '../hooks/useGCal'

interface Props {
  onClose:            () => void
  background:         Background
  onBackgroundChange: (bg: Background) => void
}

export function SettingsPanel({ onClose, background, onBackgroundChange }: Props) {
  const notion = useNotionHealth()
  const gcal   = useGCalStatus()

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="fixed top-16 left-4 z-40 w-72 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideDown 0.18s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <Text variant="title" size="small">Settings</Text>
          <IconButton icon={X} size="sm" onClick={onClose} />
        </div>

        {/* Background */}
        <div className="px-4 py-3 border-b border-stone-100">
          <Text variant="label" color="muted" className="uppercase tracking-wide mb-2">Background</Text>
          <div className="flex gap-2 flex-wrap">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.label}
                onClick={() => onBackgroundChange(b)}
                title={b.label}
                className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                style={{
                  background: b.bg,
                  borderColor: background.bg === b.bg ? '#1e1e1e' : 'transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="px-4 py-3">
          <Text variant="label" color="muted" className="uppercase tracking-wide mb-2">Integrations</Text>
          <div className="space-y-2">
            {/* Notion */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${notion.data?.configured && notion.data?.ok ? 'bg-green-500' : 'bg-stone-300'}`} />
                <Text as="span" variant="body" size="medium" className="text-stone-600">Notion</Text>
              </div>
              <Text as="span" variant="caption" color="muted">
                {notion.data?.configured ? 'Connected' : 'Not configured'}
              </Text>
            </div>

            {/* Google Calendar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${gcal.data?.connected ? 'bg-green-500' : 'bg-stone-300'}`} />
                <Text as="span" variant="body" size="medium" className="text-stone-600">Google Calendar</Text>
              </div>
              {gcal.data?.configured && !gcal.data?.connected ? (
                <button
                  onClick={() => window.open('http://localhost:3001/api/gcal/auth', '_blank', 'width=500,height=600')}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  Connect <ExternalLink size={11} />
                </button>
              ) : (
                <Text as="span" variant="caption" color="muted">
                  {gcal.data?.connected ? 'Connected' : 'Not configured'}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
