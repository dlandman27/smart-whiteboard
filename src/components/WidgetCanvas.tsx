import { Text } from '../ui/web'
import { useWhiteboardStore } from '../store/whiteboard'
import { Widget } from './Widget'
import { DatabaseWidget } from './widgets/DatabaseWidget'
import { CalendarWidget } from './widgets/CalendarWidget'
import { getStaticWidgetDef } from './widgets/registry'

interface Props {
  slideDir: 'left' | 'right'
  activeTool: string
}

export function WidgetCanvas({ slideDir, activeTool }: Props) {
  const { boards, activeBoardId } = useWhiteboardStore()

  const activeIndex = boards.findIndex((b) => b.id === activeBoardId)
  const widgets     = boards[activeIndex]?.widgets ?? []

  return (
    <div
      key={activeBoardId}
      className={`absolute inset-0 ${slideDir === 'right' ? 'board-slide-right' : 'board-slide-left'}`}
    >
      {widgets.length === 0 && activeTool === 'pointer' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <Text variant="body" color="muted">This board is empty</Text>
          <Text variant="body" size="medium" color="muted" className="mt-1">
            Draw freely, or click <Text as="span" variant="label" color="muted">Add Widget</Text> to pin content
          </Text>
        </div>
      )}

      {widgets.map((widget) => {
        const def          = getStaticWidgetDef(widget.type ?? '')
        console.log('[WidgetCanvas] widget.type:', widget.type, '→ def:', def?.label ?? 'NOT FOUND')
        const Comp         = def?.component
        const SettingsComp = def?.settingsComponent

        const content = Comp
          ? <Comp widgetId={widget.id} />
          : widget.type === 'calendar'
          ? <CalendarWidget calendarId={widget.calendarId ?? 'primary'} />
          : <DatabaseWidget databaseId={widget.databaseId ?? ''} />

        return (
          <Widget
            key={widget.id}
            id={widget.id}
            x={widget.x}
            y={widget.y}
            width={widget.width}
            height={widget.height}
            settingsContent={SettingsComp ? <SettingsComp widgetId={widget.id} /> : undefined}
            preferences={def?.preferences}
          refSize={def?.scalable !== false ? def?.defaultSize : undefined}
          >
            {content}
          </Widget>
        )
      })}
    </div>
  )
}
