import { SettingsPanel } from './SettingsPanel'

interface Props {
  showSettings:    boolean
  onCloseSettings: () => void
}

export function LogoSettings({ showSettings, onCloseSettings }: Props) {
  return showSettings ? <SettingsPanel onClose={onCloseSettings} /> : null
}
