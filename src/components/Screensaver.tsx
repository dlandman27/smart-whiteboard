import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../store/ui'

function fmt(n: number) { return String(n).padStart(2, '0') }

function getTimeParts() {
  const now = new Date()
  return {
    time: `${fmt(now.getHours())}:${fmt(now.getMinutes())}:${fmt(now.getSeconds())}`,
    date: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
  }
}

const SPEED = 60 // px/s

export function Screensaver() {
  const setScreensaverMode = useUIStore((s) => s.setScreensaverMode)
  const [clock, setClock]   = useState(getTimeParts)
  const [pos, setPos]       = useState({ x: 200, y: 200 })
  const vel      = useRef({ dx: SPEED * (Math.random() > 0.5 ? 1 : -1), dy: SPEED * (Math.random() > 0.5 ? 1 : -1) })
  const lastTime = useRef<number | null>(null)
  const raf      = useRef<number>(0)
  const boxRef   = useRef<HTMLDivElement>(null)

  // Clock ticker
  useEffect(() => {
    const id = setInterval(() => setClock(getTimeParts()), 1000)
    return () => clearInterval(id)
  }, [])

  // Bouncing position
  useEffect(() => {
    function step(ts: number) {
      if (lastTime.current === null) { lastTime.current = ts }
      const dt  = Math.min((ts - lastTime.current) / 1000, 0.1)
      lastTime.current = ts

      const boxW = boxRef.current?.offsetWidth  ?? 280
      const boxH = boxRef.current?.offsetHeight ?? 140
      const maxX = window.innerWidth  - boxW
      const maxY = window.innerHeight - boxH

      setPos((p) => {
        let nx = p.x + vel.current.dx * dt
        let ny = p.y + vel.current.dy * dt
        if (nx <= 0)    { nx = 0;    vel.current.dx = Math.abs(vel.current.dx) }
        if (nx >= maxX) { nx = maxX; vel.current.dx = -Math.abs(vel.current.dx) }
        if (ny <= 0)    { ny = 0;    vel.current.dy = Math.abs(vel.current.dy) }
        if (ny >= maxY) { ny = maxY; vel.current.dy = -Math.abs(vel.current.dy) }
        return { x: nx, y: ny }
      })

      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  // Dismiss on any interaction
  useEffect(() => {
    function dismiss() { setScreensaverMode(false) }
    window.addEventListener('keydown',   dismiss)
    window.addEventListener('click',     dismiss)
    window.addEventListener('mousemove', dismiss)
    window.addEventListener('touchstart', dismiss)
    return () => {
      window.removeEventListener('keydown',   dismiss)
      window.removeEventListener('click',     dismiss)
      window.removeEventListener('mousemove', dismiss)
      window.removeEventListener('touchstart', dismiss)
    }
  }, [setScreensaverMode])

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          99999,
        background:      '#000',
        cursor:          'none',
        userSelect:      'none',
      }}
    >
      <div
        ref={boxRef}
        style={{
          position:    'absolute',
          left:        pos.x,
          top:         pos.y,
          textAlign:   'center',
          lineHeight:  1.15,
          willChange:  'transform',
        }}
      >
        <div style={{
          fontSize:    'clamp(52px, 8vw, 96px)',
          fontWeight:  200,
          letterSpacing: '0.04em',
          color:       'rgba(255,255,255,0.9)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily:  'system-ui, sans-serif',
        }}>
          {clock.time}
        </div>
        <div style={{
          fontSize:    'clamp(14px, 1.8vw, 22px)',
          fontWeight:  300,
          color:       'rgba(255,255,255,0.4)',
          marginTop:   8,
          letterSpacing: '0.06em',
          fontFamily:  'system-ui, sans-serif',
        }}>
          {clock.date}
        </div>
      </div>
    </div>
  )
}
