import { X } from 'lucide-react'
import { IconButton } from '../ui/web'
import { ThemePicker } from './ThemePicker'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-[10000]" onClick={onClose} />
      <div
        className="fixed bottom-20 left-1/2 z-[10001] rounded-2xl"
        style={{
          transform:       'translateX(-50%)',
          animation:       'slideUp 0.15s ease-out',
          backgroundColor: 'var(--wt-settings-bg)',
          border:          '1px solid var(--wt-settings-border)',
          boxShadow:       'var(--wt-shadow-lg)',
          backdropFilter:  'var(--wt-backdrop)',
          width:           320,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3" style={{ borderBottom: '1px solid var(--wt-settings-divider)' }}>
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--wt-text-muted)' }}>Theme</span>
          <IconButton icon={X} size="sm" onClick={onClose} />
        </div>

        {/* Theme picker */}
        <div className="px-3 py-3">
          <ThemePicker />
        </div>
      </div>
    </>
  )
}
