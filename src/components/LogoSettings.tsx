import { SettingsPanel } from './SettingsPanel'
import { type Background } from '../constants/backgrounds'

interface Props {
  background:         Background
  onBackgroundChange: (bg: Background) => void
  showSettings:       boolean
  onToggleSettings:   () => void
  onCloseSettings:    () => void
}

export function LogoSettings({ background, onBackgroundChange, showSettings, onToggleSettings, onCloseSettings }: Props) {
  return (
    <>
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <button
          onClick={onToggleSettings}
          className="wt-logo-btn flex items-center justify-center w-10 h-10 rounded-xl"
          title="Settings"
        >
          <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          onClose={onCloseSettings}
          background={background}
          onBackgroundChange={onBackgroundChange}
        />
      )}
    </>
  )
}
