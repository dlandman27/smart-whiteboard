import { useEffect, useRef, useState } from 'react'
import { useUndoStore } from '../store/undo'
import { useWhiteboardStore } from '../store/whiteboard'
import { Icon } from '../ui/web'

const UNDO_DURATION = 5000

export function UndoToast() {
  const { entry, clear } = useUndoStore()
  const addWidget        = useWhiteboardStore((s) => s.addWidget)
  const [visible,  setVisible]  = useState(false)
  const [progress, setProgress] = useState(100)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef   = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const entryId  = entry?.id

  useEffect(() => {
    if (!entryId) {
      setVisible(false)
      return
    }

    setProgress(100)
    setVisible(true)
    startRef.current = Date.now()

    function tick() {
      const pct = Math.max(0, 100 - ((Date.now() - startRef.current) / UNDO_DURATION) * 100)
      setProgress(pct)
      if (pct > 0) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    timerRef.current = setTimeout(() => clear(), UNDO_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current)   cancelAnimationFrame(rafRef.current)
    }
  }, [entryId])

  function handleUndo() {
    if (!entry) return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current)   cancelAnimationFrame(rafRef.current)
    addWidget(entry.snapshot)
    clear()
  }

  function handleDismiss() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current)   cancelAnimationFrame(rafRef.current)
    clear()
  }

  if (!entry) return null

  return (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        bottom:    28,
        left:      '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:   visible ? 1 : 0,
        transition: 'opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="relative flex items-center gap-3 px-4 py-3 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--wt-bg)',
          border:          '1px solid var(--wt-border-active)',
          boxShadow:       '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
          backdropFilter:  'var(--wt-backdrop)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--wt-text)' }}>
          {entry.label}
        </span>

        <button
          className="text-sm font-semibold px-3 py-1 rounded-lg transition-colors"
          style={{
            color:      'var(--wt-accent)',
            background: 'color-mix(in srgb, var(--wt-accent) 12%, transparent)',
          }}
          onClick={handleUndo}
        >
          Undo
        </button>

        <button
          className="wt-action-btn flex-shrink-0"
          style={{ width: 20, height: 20 }}
          onClick={handleDismiss}
        >
          <Icon icon="X" size={10} />
        </button>

        {/* Countdown progress bar */}
        <div
          style={{
            position:        'absolute',
            bottom:          0,
            left:            0,
            height:          2,
            width:           `${progress}%`,
            backgroundColor: 'var(--wt-accent)',
            opacity:         0.6,
            transition:      'width 0.05s linear',
          }}
        />
      </div>
    </div>
  )
}
