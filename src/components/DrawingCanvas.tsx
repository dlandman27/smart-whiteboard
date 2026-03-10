import { useRef, useEffect, useCallback, useState } from 'react'

interface Props {
  boardId: string
  tool: 'pointer' | 'marker' | 'eraser'
  color: string
  strokeWidth: number
  eraserSize: number
}

function save(boardId: string, dataUrl: string) {
  try { localStorage.setItem(`wb-drawing-${boardId}`, dataUrl) } catch {}
}

function load(boardId: string): string | null {
  return localStorage.getItem(`wb-drawing-${boardId}`)
}

export function DrawingCanvas({ boardId, tool, color, strokeWidth, eraserSize }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null)

  // Load saved drawing when board changes, save when leaving
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const saved = load(boardId)
    if (saved) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = saved
    }

    return () => {
      if (canvas.width > 0) save(boardId, canvas.toDataURL())
    }
  }, [boardId])

  // Handle window resize: save → resize canvas → restore
  useEffect(() => {
    function onResize() {
      const canvas = canvasRef.current
      if (!canvas) return
      const dataUrl = canvas.toDataURL()
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const img = new Image()
      img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0)
      img.src = dataUrl
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t.clientX, y: t.clientY }
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
  }

  const applyStroke = useCallback(
    (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineWidth = eraserSize
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
      }
      ctx.stroke()
    },
    [tool, color, strokeWidth, eraserSize]
  )

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (tool === 'pointer') return
      e.preventDefault()
      isDrawing.current = true
      const pos = getPos(e)
      lastPos.current = pos

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      ctx.beginPath()
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.arc(pos.x, pos.y, eraserSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,1)'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.arc(pos.x, pos.y, strokeWidth / 2, 0, Math.PI * 2)
        ctx.fillStyle = color
      }
      ctx.fill()
    },
    [tool, color, strokeWidth, eraserSize]
  )

  const onDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getPos(e)

      if (tool === 'eraser') setEraserPos(pos)

      if (!isDrawing.current || tool === 'pointer' || !lastPos.current) return
      e.preventDefault()

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      applyStroke(ctx, lastPos.current, pos)
      lastPos.current = pos
    },
    [tool, applyStroke]
  )

  const stopDraw = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPos.current = null
    const canvas = canvasRef.current
    if (canvas) save(boardId, canvas.toDataURL())
  }, [boardId])

  const cursor =
    tool === 'pointer' ? 'default' : tool === 'eraser' ? 'none' : 'crosshair'

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          zIndex: 15,
          cursor,
          pointerEvents: tool === 'pointer' ? 'none' : 'all',
          touchAction: 'none',
        }}
        onMouseDown={startDraw}
        onMouseMove={onDraw}
        onMouseUp={stopDraw}
        onMouseLeave={() => { stopDraw(); setEraserPos(null) }}
        onTouchStart={startDraw}
        onTouchMove={onDraw}
        onTouchEnd={stopDraw}
      />

      {/* Eraser size preview circle */}
      {tool === 'eraser' && eraserPos && (
        <div
          className="pointer-events-none fixed rounded-full border-2 border-stone-400"
          style={{
            zIndex: 50,
            width: eraserSize,
            height: eraserSize,
            left: eraserPos.x - eraserSize / 2,
            top: eraserPos.y - eraserSize / 2,
          }}
        />
      )}
    </>
  )
}
