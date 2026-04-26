import { useRef, useEffect, useState } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'
import { useWidgetSizeContext } from '@whiteboard/ui-kit'

interface NoteWidgetSettings {
  content: string
  align:   'left' | 'center' | 'right'
}

const DEFAULTS: NoteWidgetSettings = { content: '', align: 'center' }

export function NoteWidget({ widgetId }: { widgetId: string }) {
  const [settings, set]         = useWidgetSettings<NoteWidgetSettings>(widgetId, DEFAULTS)
  const [editing, setEditing]   = useState(false)
  const [liveLen, setLiveLen]   = useState(settings.content.length)
  const editRef                 = useRef<HTMLDivElement>(null)
  const { containerWidth: w, containerHeight: h } = useWidgetSizeContext()

  // Font fills the card width — shrinks as text grows
  const PLACEHOLDER = 'Tap to write…'
  const charCount    = editing ? (liveLen || 1) : (settings.content.length || PLACEHOLDER.length)
  const safeW        = w || 200
  const safeH        = h || 200
  const charsPerLine = Math.ceil(Math.sqrt(charCount * (safeW / safeH)))
  const fontSize     = Math.max(14, Math.min(Math.floor(safeW * 0.82 / charsPerLine), Math.floor(safeH * 0.75)))

  useEffect(() => {
    if (!editing || !editRef.current) return
    editRef.current.textContent = settings.content
    setLiveLen(settings.content.length)
    editRef.current.focus()
    try {
      const range = document.createRange()
      range.selectNodeContents(editRef.current)
      range.collapse(false)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
    } catch {}
  }, [editing])

  function save() {
    const content = editRef.current?.textContent ?? ''
    set({ content })
    setEditing(false)
  }

  const textStyle: React.CSSProperties = {
    fontSize,
    lineHeight:    1.15,
    fontWeight:    '700',
    letterSpacing: '-0.02em',
    textAlign:     settings.align,
    wordBreak:     'break-word',
    overflowWrap:  'break-word',
    width:         '100%',
    transition:    'font-size 0.1s ease',
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box',
    }}>
      {editing ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          onPointerDown={(e) => e.stopPropagation()}
          onInput={(e) => setLiveLen(e.currentTarget.textContent?.length ?? 0)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { set({ content: editRef.current?.textContent ?? settings.content }); setEditing(false) }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
          }}
          style={{
            ...textStyle,
            outline:    'none',
            color:      'var(--wt-text)',
            cursor:     'text',
            whiteSpace: 'pre-wrap',
            minHeight:  '1em',
          }}
        />
      ) : (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setEditing(true)}
          style={{
            ...textStyle,
            color:      settings.content ? 'var(--wt-text)' : 'var(--wt-text-muted)',
            cursor:     'text',
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
          }}
        >
          {settings.content || 'Tap to write…'}
        </div>
      )}
    </div>
  )
}

export function NoteSettings({ widgetId }: { widgetId: string }) {
  const [settings, set] = useWidgetSettings<NoteWidgetSettings>(widgetId, DEFAULTS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Align
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => set({ align: a })}
            style={{
              flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 500,
              borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize',
              border: `1px solid ${settings.align === a ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
              background: settings.align === a ? 'var(--wt-accent)' : 'var(--wt-surface)',
              color: settings.align === a ? 'var(--wt-accent-text)' : 'var(--wt-text)',
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}
