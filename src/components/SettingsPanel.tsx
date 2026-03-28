import { Panel, PanelHeader } from '../ui/web'
import { ThemePicker } from './ThemePicker'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  return (
    <Panel width={340} onClose={onClose}>
      <PanelHeader title="Theme" onClose={onClose} />
      <div className="px-3 py-3">
        <ThemePicker />
      </div>
    </Panel>
  )
}
