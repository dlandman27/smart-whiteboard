import { useEffect, useRef, useState } from 'react'
import { SPRITES, PX, getSpriteType } from './sprites'
import { PixelSprite } from './PixelSprite'

export interface AgentInfo { id: string; name: string; icon: string; description: string; spriteType?: string }

interface WalkingPetProps {
  agent:         AgentInfo
  mood:          string
  message:       string | null
  onMessageDone: () => void
  onInspect:     () => void
  inspecting:    boolean
}

export function WalkingPet({ agent, mood, message, onMessageDone, onInspect, inspecting }: WalkingPetProps) {
  const spriteType   = getSpriteType(agent.id, agent.icon, agent.spriteType)
  const sprite       = SPRITES[spriteType]
  const spriteWidth  = sprite.width  * PX
  const spriteHeight = sprite.height * PX

  const [x,       setX]       = useState(() => Math.random() * (window.innerWidth - spriteWidth - 32))
  const [dir,     setDir]     = useState<1 | -1>(() => Math.random() > 0.5 ? 1 : -1)
  const [frame,   setFrame]   = useState(0)
  const [walking, setWalking] = useState(true)
  const [jumping, setJumping] = useState(false)

  const msgTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirRef         = useRef(dir)
  const walkingRef     = useRef(walking)
  const inspectingRef  = useRef(inspecting)
  const moodRef        = useRef(mood)
  dirRef.current        = dir
  walkingRef.current    = walking
  inspectingRef.current = inspecting
  moodRef.current       = mood

  const speed = useRef(0.035 + Math.random() * 0.03)

  function scheduleNextIdle() {
    idleTimeoutRef.current = setTimeout(() => {
      setWalking(false)
      setTimeout(() => { setWalking(true); scheduleNextIdle() }, 3000 + Math.random() * 5000)
    }, 6000 + Math.random() * 10000)
  }

  useEffect(() => {
    scheduleNextIdle()
    let lastTime = performance.now()
    const raf = { id: 0 }

    function tick(now: number) {
      const dt = now - lastTime
      lastTime = now
      const stopped = !walkingRef.current || moodRef.current === 'speaking' || inspectingRef.current
      if (!stopped) {
        setX((prev) => {
          const next = prev + dirRef.current * speed.current * dt
          const max  = window.innerWidth - spriteWidth - 32
          if (next <= 8)   { dirRef.current = 1;  setDir(1);  return 8 }
          if (next >= max) { dirRef.current = -1; setDir(-1); return max }
          return next
        })
      }
      raf.id = requestAnimationFrame(tick)
    }
    raf.id = requestAnimationFrame(tick)

    const frameTick = setInterval(() => {
      const stopped = !walkingRef.current || moodRef.current === 'speaking' || inspectingRef.current
      setFrame(stopped ? 0 : (f) => f === 1 ? 2 : 1)
    }, 480)

    return () => {
      cancelAnimationFrame(raf.id)
      clearInterval(frameTick)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (mood === 'active') { setJumping(true); setTimeout(() => setJumping(false), 600) }
  }, [mood])

  useEffect(() => {
    if (message) {
      if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current)
      msgTimeoutRef.current = setTimeout(onMessageDone, 5000)
    }
    return () => { if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current) }
  }, [message])

  const isSpeaking = !!message
  const showBubble = isSpeaking || inspecting

  return (
    <div
      style={{
        position: 'fixed', bottom: jumping ? 18 : 14, left: x, zIndex: 9980,
        transition: jumping ? 'bottom 0.15s ease-out' : 'bottom 0.2s ease-in',
        userSelect: 'none', pointerEvents: 'auto', cursor: 'pointer',
      }}
      onClick={onInspect}
      title={agent.name}
    >
      {showBubble && (
        <div style={{
          position: 'absolute', bottom: spriteHeight + 6, left: '50%', transform: 'translateX(-50%)',
          width: 190, padding: '8px 10px', borderRadius: 10, fontSize: 11, lineHeight: 1.45,
          backgroundColor: 'var(--wt-settings-bg)', border: '1px solid var(--wt-settings-border)',
          backdropFilter: 'var(--wt-backdrop)', boxShadow: 'var(--wt-shadow-lg)', color: 'var(--wt-text)',
          animation: 'petPopIn 0.15s cubic-bezier(0.34,1.56,0.64,1)', whiteSpace: 'normal', pointerEvents: 'none',
        }}>
          <strong style={{ display: 'block', fontSize: 10, marginBottom: 3, color: 'var(--wt-accent)' }}>
            {agent.icon} {agent.name}
          </strong>
          <span style={{ opacity: 0.75 }}>
            {inspecting && !isSpeaking ? agent.description : message}
          </span>
          <div style={{
            position: 'absolute', bottom: -5, left: Math.min(Math.max(spriteWidth / 2, 16), 174),
            width: 8, height: 8, background: 'var(--wt-settings-bg)',
            border: '1px solid var(--wt-settings-border)', borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
      <div style={{
        transform: `translateY(${jumping ? -14 : showBubble ? -4 : 0}px)`, transition: 'transform 0.1s ease',
        filter: showBubble
          ? `drop-shadow(0 0 6px ${sprite.colors.B}bb)`
          : mood === 'active' ? `drop-shadow(0 0 8px ${sprite.colors.B}cc)` : 'none',
      }}>
        <PixelSprite sprite={sprite} frameIdx={frame} flip={dir === -1} />
      </div>
    </div>
  )
}
