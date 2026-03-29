import { Panel, PanelHeader } from '../ui/web'
import { ThemePicker } from './ThemePicker'
import { BackgroundPicker } from './BackgroundPicker'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  return (
    <Panel width={432} onClose={onClose}>
      <PanelHeader title="Appearance" onClose={onClose} />
      <div className="px-3 py-3 space-y-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--wt-text-muted)' }}>
            Theme
          </p>
          <ThemePicker />
        </section>
        <div style={{ height: 1, background: 'var(--wt-settings-divider)' }} />
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--wt-text-muted)' }}>
            Background
          </p>
          <BackgroundPicker />
        </section>
      </div>
    </Panel>
  )
}
