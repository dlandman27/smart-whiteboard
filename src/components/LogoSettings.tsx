import { useState } from 'react'
import { SettingsPanel } from './SettingsPanel'
import { type Background } from '../constants/backgrounds'

interface Props {
  background: Background
  onBackgroundChange: (bg: Background) => void
}

export function LogoSettings({ background, onBackgroundChange }: Props) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="flex items-center justify-center w-10 h-10 bg-white border border-stone-200 shadow-lg rounded-xl hover:bg-stone-50 transition-colors"
          title="Settings"
        >
          <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          background={background}
          onBackgroundChange={onBackgroundChange}
        />
      )}
    </>
  )
}
