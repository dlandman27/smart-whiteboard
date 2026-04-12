import { useState } from 'react'
import { Icon } from '@whiteboard/ui-kit'
import { useWhiteboardStore } from '../store/whiteboard'
import { BOARD_TEMPLATES } from '../constants/boardTemplates'
import type { BoardTemplate } from '../constants/boardTemplates'
import { Logo } from './Logo'

interface Props {
  onComplete: () => void
}

export function TemplatePicker({ onComplete }: Props) {
  const { addBoard, setActiveBoard, addWidget, setLayout, boards } = useWhiteboardStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  function applyTemplate(template: BoardTemplate) {
    if (creating) return
    setCreating(true)

    // Find the first user board (non-system) to populate, or create one
    const userBoard = boards.find((b) => !b.boardType)

    if (userBoard) {
      // Set the layout on the existing board
      setLayout(userBoard.id, template.layoutId)
      setActiveBoard(userBoard.id)

      // Add widgets to the board
      for (const w of template.widgets) {
        addWidget({
          type:          w.type,
          variantId:     w.variantId,
          settings:      w.settings,
          slotId:        w.slotId,
          databaseTitle: '',
          x:             0,
          y:             0,
          width:         320,
          height:        240,
        })
      }
    } else {
      // Create a new board
      const boardId = crypto.randomUUID()
      addBoard(template.name, boardId)
      setLayout(boardId, template.layoutId)

      // Need to set active and add widgets
      for (const w of template.widgets) {
        addWidget({
          type:          w.type,
          variantId:     w.variantId,
          settings:      w.settings,
          slotId:        w.slotId,
          databaseTitle: '',
          x:             0,
          y:             0,
          width:         320,
          height:        240,
        })
      }
    }

    onComplete()
  }

  return (
    <div className="template-picker">
      <style>{`
        .template-picker {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--wt-bg);
          overflow-y: auto;
          padding: 40px 24px;
          animation: tpFadeIn 0.4s ease both;
        }

        @keyframes tpFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Subtle gradient orbs */
        .template-picker::before,
        .template-picker::after {
          content: '';
          position: fixed;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.06;
          pointer-events: none;
        }
        .template-picker::before {
          width: 700px;
          height: 700px;
          top: -250px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--wt-accent);
        }
        .template-picker::after {
          width: 500px;
          height: 500px;
          bottom: -200px;
          right: -100px;
          background: #a78bfa;
        }

        .tp-content {
          position: relative;
          z-index: 1;
          max-width: 720px;
          width: 100%;
        }

        .tp-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .tp-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .tp-title {
          font-size: 28px;
          font-weight: 600;
          color: var(--wt-text);
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }

        .tp-subtitle {
          font-size: 15px;
          color: var(--wt-text);
          opacity: 0.4;
          margin: 0;
        }

        .tp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .tp-card {
          position: relative;
          padding: 24px 20px;
          border-radius: 14px;
          border: 1px solid var(--wt-border);
          background: var(--wt-bg-surface);
          cursor: pointer;
          transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
          animation: tpCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .tp-card:nth-child(1) { animation-delay: 0.05s; }
        .tp-card:nth-child(2) { animation-delay: 0.1s; }
        .tp-card:nth-child(3) { animation-delay: 0.15s; }
        .tp-card:nth-child(4) { animation-delay: 0.2s; }
        .tp-card:nth-child(5) { animation-delay: 0.25s; }

        @keyframes tpCardIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tp-card:hover {
          border-color: var(--wt-accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .tp-card[data-selected="true"] {
          border-color: var(--wt-accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--wt-accent) 25%, transparent),
                      0 8px 24px rgba(0,0,0,0.15);
        }

        .tp-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--wt-accent) 12%, transparent);
          margin-bottom: 14px;
        }

        .tp-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--wt-text);
          margin: 0 0 6px;
        }

        .tp-card-desc {
          font-size: 12px;
          color: var(--wt-text);
          opacity: 0.4;
          margin: 0;
          line-height: 1.5;
        }

        .tp-card-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--wt-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.5);
          transition: opacity 0.2s, transform 0.2s;
        }

        .tp-card[data-selected="true"] .tp-card-badge {
          opacity: 1;
          transform: scale(1);
        }

        .tp-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .tp-btn {
          padding: 12px 32px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          border: none;
        }

        .tp-btn:active {
          transform: scale(0.97);
        }

        .tp-btn-primary {
          background: var(--wt-accent);
          color: #fff;
        }

        .tp-btn-primary:hover:not(:disabled) {
          opacity: 0.9;
        }

        .tp-btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tp-btn-ghost {
          background: transparent;
          color: var(--wt-text);
          opacity: 0.4;
          border: 1px solid var(--wt-border);
        }

        .tp-btn-ghost:hover {
          opacity: 0.7;
          border-color: color-mix(in srgb, var(--wt-border) 100%, var(--wt-text) 10%);
        }
      `}</style>

      <div className="tp-content">
        <div className="tp-header">
          <div className="tp-logo">
            <Logo size={40} />
          </div>
          <h1 className="tp-title">Choose a template</h1>
          <p className="tp-subtitle">Pick a starting point for your board, or start from scratch</p>
        </div>

        <div className="tp-grid">
          {BOARD_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="tp-card"
              data-selected={selected === t.id}
              onClick={() => setSelected(t.id)}
              onDoubleClick={() => { setSelected(t.id); applyTemplate(t) }}
            >
              <div className="tp-card-badge">
                <Icon icon="Check" size={12} weight="bold" style={{ color: '#fff' }} />
              </div>
              <div className="tp-card-icon">
                <Icon icon={t.icon} size={22} weight="duotone" style={{ color: 'var(--wt-accent)' }} />
              </div>
              <p className="tp-card-name">{t.name}</p>
              <p className="tp-card-desc">{t.description}</p>
            </div>
          ))}
        </div>

        <div className="tp-actions">
          <button
            className="tp-btn tp-btn-ghost"
            onClick={() => applyTemplate(BOARD_TEMPLATES.find((t) => t.id === 'blank')!)}
            disabled={creating}
          >
            Skip
          </button>
          <button
            className="tp-btn tp-btn-primary"
            disabled={!selected || creating}
            onClick={() => {
              const t = BOARD_TEMPLATES.find((t) => t.id === selected)
              if (t) applyTemplate(t)
            }}
          >
            {creating ? 'Setting up...' : 'Use template'}
          </button>
        </div>
      </div>
    </div>
  )
}
