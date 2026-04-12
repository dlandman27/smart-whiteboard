import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { SettingsSection, Toggle, FlexCol, FlexRow, Icon } from '@whiteboard/ui-kit'
import { DEFAULT_STOCK_SETTINGS, type StockTickerSettings as Settings } from './StockTickerWidget'

const PRESETS: { name: string; symbols: string[] }[] = [
  { name: 'Tech Giants',  symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'] },
  { name: 'S&P Top 5',    symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'] },
  { name: 'Crypto',       symbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD'] },
]

export function StockTickerSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<Settings>(widgetId, DEFAULT_STOCK_SETTINGS)
  const [input, setInput] = useState('')

  function addSymbol() {
    const sym = input.trim().toUpperCase()
    if (!sym || settings.symbols.includes(sym)) { setInput(''); return }
    set({ symbols: [...settings.symbols, sym] })
    setInput('')
  }

  function removeSymbol(sym: string) {
    set({ symbols: settings.symbols.filter((s) => s !== sym) })
  }

  return (
    <FlexCol className="gap-5" fullWidth>
      <SettingsSection label="Add symbol">
        <FlexRow align="center" className="gap-2">
          <input
            className="wt-input flex-1 rounded-lg px-3 text-xs"
            style={{ height: 32 }}
            placeholder="e.g. AAPL, BTC-USD"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSymbol() }}
          />
          <button
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 32,
              height: 32,
              background: 'var(--wt-accent)',
              color: '#fff',
            }}
            onClick={addSymbol}
          >
            <Icon icon="Plus" size={14} />
          </button>
        </FlexRow>
      </SettingsSection>

      <SettingsSection label="Current symbols">
        <div className="flex flex-wrap gap-1.5">
          {settings.symbols.map((sym) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
              style={{
                background: 'var(--wt-bg-surface)',
                color: 'var(--wt-text)',
                border: '1px solid var(--wt-border)',
              }}
            >
              {sym}
              <button
                className="flex items-center opacity-50 hover:opacity-100 transition-opacity"
                onClick={() => removeSymbol(sym)}
              >
                <Icon icon="X" size={10} />
              </button>
            </span>
          ))}
          {settings.symbols.length === 0 && (
            <span className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>No symbols added</span>
          )}
        </div>
      </SettingsSection>

      <SettingsSection label="Quick presets">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const isActive = JSON.stringify(settings.symbols) === JSON.stringify(p.symbols)
            return (
              <button
                key={p.name}
                className="px-2.5 py-1 rounded-md text-xs transition-colors"
                style={{
                  background: isActive ? 'var(--wt-accent)' : 'var(--wt-bg-surface)',
                  color: isActive ? '#fff' : 'var(--wt-text-muted)',
                  border: '1px solid var(--wt-border)',
                }}
                onClick={() => set({ symbols: p.symbols })}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection label="Display options">
        <FlexCol className="gap-3">
          <Toggle
            label="Show price change"
            value={settings.showChange}
            onChange={(v) => set({ showChange: v })}
          />
          <Toggle
            label="Show percent change"
            value={settings.showPercent}
            onChange={(v) => set({ showPercent: v })}
          />
          <Toggle
            label="Compact mode"
            value={settings.compact}
            onChange={(v) => set({ compact: v })}
          />
        </FlexCol>
      </SettingsSection>
    </FlexCol>
  )
}
