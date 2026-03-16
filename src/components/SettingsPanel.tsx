import { X } from 'lucide-react'
import { IconButton } from '../ui/web'
import { BACKGROUNDS, type Background } from '../constants/backgrounds'
import { useNotionHealth } from '../hooks/useNotion'
import { ThemePicker } from './ThemePicker'

interface Props {
  onClose:            () => void
  background:         Background
  onBackgroundChange: (bg: Background) => void
}

export function SettingsPanel({ onClose, background, onBackgroundChange }: Props) {
  const notion = useNotionHealth()

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed top-16 left-4 z-40 w-72 rounded-2xl overflow-hidden"
        style={{
          animation:       'slideDown 0.18s ease-out',
          backgroundColor: 'var(--wt-settings-bg)',
          border:          '1px solid var(--wt-settings-border)',
          boxShadow:       'var(--wt-shadow-lg)',
          backdropFilter:  'var(--wt-backdrop)',
          maxHeight:       'calc(100vh - 80px)',
          overflowY:       'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--wt-text)' }}>Appearance</span>
          <IconButton icon={X} size="sm" onClick={onClose} />
        </div>

        {/* Theme */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wt-settings-label)' }}>Theme</p>
          <ThemePicker />
        </div>

        {/* Background */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wt-settings-label)' }}>Background</p>
          <div className="flex gap-2 flex-wrap">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.label}
                onClick={() => onBackgroundChange(b)}
                title={b.label}
                className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                style={{
                  background:  b.bg,
                  borderColor: background.bg === b.bg ? 'var(--wt-text)' : 'transparent',
                  boxShadow:   '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Notion status */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: notion.data?.configured ? '#22c55e' : 'var(--wt-border-active)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wt-settings-label)' }}>Notion</p>
            </div>
            <span className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
              {notion.data?.configured ? 'Connected' : 'Set NOTION_API_KEY in .env'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
