import { useLayout } from '../../hooks/useLayout'
import { useWhiteboardStore } from '../../store/whiteboard'
import { LayoutSlot } from './LayoutSlot'
import type { PendingWidget } from '../../types'

interface Props {
  pendingWidget:    PendingWidget | null
  draggingWidgetId: string | null
  hoveredSlotId:    string | null
  onSlotClick:      (slotId: string) => void
}

export function LayoutSlots({ pendingWidget, draggingWidgetId, hoveredSlotId, onSlotClick }: Props) {
  const { slotRects }   = useLayout()
  const boards          = useWhiteboardStore((s) => s.boards)
  const activeBoardId   = useWhiteboardStore((s) => s.activeBoardId)
  const widgets         = boards.find((b) => b.id === activeBoardId)?.widgets ?? []

  // Map slotId → widget id so we can detect occupants
  const slotOccupant = new Map(
    widgets.filter((w) => w.slotId).map((w) => [w.slotId!, w.id])
  )

  const isDragging  = !!draggingWidgetId
  const isAddingNew = !!pendingWidget && !draggingWidgetId

  return (
    <>
      {slotRects.map((rect) => {
        const occupantId = slotOccupant.get(rect.id)
        // The slot occupied by the widget being dragged should show as empty
        const isOccupiedByOther = !!occupantId && occupantId !== draggingWidgetId
        const isHovered = rect.id === hoveredSlotId

        let mode: 'hidden' | 'place' | 'swap' = 'hidden'
        if (isDragging) {
          mode = isOccupiedByOther ? 'swap' : 'place'
        } else if (isAddingNew) {
          // Bento-only: when adding a new widget, only empty slots are valid drop targets.
          mode = isOccupiedByOther ? 'hidden' : 'place'
        }

        return (
          <LayoutSlot
            key={rect.id}
            {...rect}
            mode={mode}
            isHovered={isHovered}
            onClick={mode !== 'hidden' ? () => onSlotClick(rect.id) : undefined}
          />
        )
      })}
    </>
  )
}
