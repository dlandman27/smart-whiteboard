import { useWhiteboardStore } from '../../store/whiteboard'
import type { WidgetProps } from './registry'

export interface NoteWidgetSettings {
  text:       string
  color:      string
  fontSize:   'sm' | 'md' | 'lg'
  fontFamily: 'sans' | 'mono' | 'serif'
  align:      'left' | 'center'
}

export const DEFAULT_NOTE_SETTINGS: NoteWidgetSettings = {
  text:       '',
  color:      '#fef9c3',
  fontSize:   'md',
  fontFamily: 'sans',
  align:      'left',
}

const FONT_SIZE: Record<NoteWidgetSettings['fontSize'], string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

const FONT_FAMILY: Record<NoteWidgetSettings['fontFamily'], string> = {
  sans:  'font-sans',
  mono:  'font-mono',
  serif: 'font-serif',
}

export function NoteWidget({ widgetId }: WidgetProps) {
  const raw            = useWhiteboardStore((s) =>
    s.boards.find((b) => b.id === s.activeBoardId)?.widgets.find((w) => w.id === widgetId)?.settings
  )
  const updateSettings = useWhiteboardStore((s) => s.updateSettings)
  const settings: NoteWidgetSettings = { ...DEFAULT_NOTE_SETTINGS, ...(raw ?? {}) } as NoteWidgetSettings

  const { text, color, fontSize, fontFamily, align } = settings

  return (
    <div className="w-full h-full" style={{ backgroundColor: color }}>
      <textarea
        className={`
          note-scroll w-full h-full resize-none bg-transparent border-none outline-none
          pt-9 px-4 pb-4 leading-relaxed text-stone-800
          placeholder:text-stone-400
          ${FONT_SIZE[fontSize]} ${FONT_FAMILY[fontFamily]}
          ${align === 'center' ? 'text-center' : 'text-left'}
        `}
        value={text}
        onChange={(e) => updateSettings(widgetId, { text: e.target.value })}
        placeholder="Write something…"
      />
    </div>
  )
}
