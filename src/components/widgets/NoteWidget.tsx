import { useRef, useState, useEffect } from 'react'
import { useWidgetSettings } from '@whiteboard/sdk'

interface NoteWidgetSettings {
  content:   string
  fontSize:  number
  align:     'left' | 'center' | 'right'
}

const DEFAULTS: NoteWidgetSettings = {
  content:  '',
  fontSize: 24,
  align:    'left',
}

export function NoteWidget({ widgetId }: { widgetId: string }) {
  const [settings, setSettings] = useWidgetSettings<NoteWidgetSettings>(widgetId, DEFAULTS)
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState(settings.content)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(settings.content)
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }, [editing])

  function save() {
    setSettings({ content: draft })
    setEditing(false)
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(settings.content); setEditing(false) }
          if (e.key === 'Enter' && e.metaKey) save()
        }}
        placeholder="Type a note…"
        style={{
          width:      '100%',
          height:     '100%',
          background: 'transparent',
          border:     'none',
          outline:    'none',
          resize:     'none',
          padding:    '16px',
          fontSize:   settings.fontSize,
          textAlign:  settings.align,
          color:      'var(--wt-text)',
          fontFamily: 'inherit',
          lineHeight: 1.5,
        }}
      />
    )
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        width:     '100%',
        height:    '100%',
        padding:   '16px',
        fontSize:  settings.fontSize,
        textAlign: settings.align,
        color:     settings.content ? 'var(--wt-text)' : 'var(--wt-text-muted)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflow:  'hidden',
        cursor:    'default',
        userSelect: 'none',
      }}
    >
      {settings.content || 'Double-click to edit…'}
    </div>
  )
}
