import { useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'

interface UrlWidgetSettings {
  url:   string
  title: string
}

const DEFAULTS: UrlWidgetSettings = { url: '', title: '' }

function ensureHttps(val: string): string {
  if (!val) return ''
  if (/^https?:\/\//i.test(val)) return val
  return `https://${val}`
}

export function UrlWidget({ widgetId }: { widgetId: string }) {
  const [settings] = useWidgetSettings<UrlWidgetSettings>(widgetId, DEFAULTS)
  const { url, title } = settings

  if (!url) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, color: 'var(--wt-text-muted)',
        background: 'var(--wt-bg)',
      }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx={12} cy={12} r={10} />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span style={{ fontSize: 13 }}>No URL set</span>
        <span style={{ fontSize: 11, opacity: 0.6, textAlign: 'center', maxWidth: 200 }}>
          Say "hey wally, show me…" or paste a URL in settings
        </span>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', position: 'relative' }}>
      {title && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1,
          padding: '5px 10px', fontSize: 12, fontWeight: 500,
          color: 'var(--wt-text)', background: 'var(--wt-surface)',
          borderBottom: '1px solid var(--wt-border)', pointerEvents: 'none',
        }}>
          {title}
        </div>
      )}
      <iframe
        key={url}
        src={url}
        style={{
          width: '100%', height: '100%', border: 'none',
          paddingTop: title ? 28 : 0,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title={title || url}
      />
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function UrlSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<UrlWidgetSettings>(widgetId, DEFAULTS)
  const [input, setInput]   = useState(settings.url ?? '')
  const [titleIn, setTitleIn] = useState(settings.title ?? '')

  function apply() {
    set({ url: ensureHttps(input.trim()), title: titleIn.trim() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>URL</label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="https://example.com"
          style={{
            padding: '6px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--wt-text-muted)' }}>Title (optional)</label>
        <input
          value={titleIn}
          onChange={(e) => setTitleIn(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="e.g. Premier League Table"
          style={{
            padding: '6px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--wt-border)', background: 'var(--wt-surface)',
            color: 'var(--wt-text)', outline: 'none',
          }}
        />
      </div>

      <button
        onClick={apply}
        style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: 'var(--wt-accent)', color: 'var(--wt-accent-text)',
          border: 'none', cursor: 'pointer',
        }}
      >
        Apply
      </button>

      {settings.url && (
        <p style={{ fontSize: 11, color: 'var(--wt-text-muted)', wordBreak: 'break-all' }}>
          Note: some sites block embedding (e.g. Google, Twitter). Try a different URL if it shows an error.
        </p>
      )}
    </div>
  )
}
