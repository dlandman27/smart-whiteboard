import { useEffect, useRef, useState } from 'react'
import { usePetsStore } from '../store/pets'

// ── Pixel art definitions ──────────────────────────────────────────────────────
// 8-wide strings, each char = 1 pixel. ' '=transparent, any other char = a layer color.
// Two walk frames per character (legs alternate). Idle frame = frame 0.
// Colors: B=body, D=dark/outline, E=eye, S=skin, A=accent

type Frame = string[]  // array of 8-char rows

interface Sprite {
  frames: [Frame, Frame, Frame]  // [idle/stand, walk1, walk2]
  colors: Record<string, string>
  width:  number
  height: number
}

export const SPRITES: Record<string, Sprite> = {

  // ── Redesigned ────────────────────────────────────────────────────────────────

  cat: {
    // triangular ears, almond eyes, muzzle dot
    colors: { D: '#111', B: '#c084fc', E: '#34d399', S: '#e9d5ff', A: '#7e22ce' },
    width: 8, height: 10,
    frames: [
      ['D     D ', 'DD   DD ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBBSBBD ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D     D ', 'DD   DD ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBBSBBD ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D     D ', 'DD   DD ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBBSBBD ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  dog: {
    // floppy ears as side panels, snout protrusion, collar
    colors: { D: '#111', B: '#f97316', E: '#fff', S: '#fde68a', A: '#c2410c' },
    width: 8, height: 10,
    frames: [
      [' DDDDDD ', 'DBBBBBD ', 'BSSSSBD ', 'BSESSD  ', 'BSSASBD ', ' DDDDD  ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'BSSSSBD ', 'BSESSD  ', 'BSSASBD ', ' DDDDD  ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'BSSSSBD ', 'BSESSD  ', 'BSSASBD ', ' DDDDD  ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  robot: {
    // unchanged — this one is perfect
    colors: { D: '#111', B: '#60a5fa', E: '#fbbf24', S: '#93c5fd', A: '#2563eb' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DAEAEBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DAEAEBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DAEAEBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  bunny: {
    // unchanged — tall ears are distinctive, works well
    colors: { D: '#111', B: '#f9a8d4', E: '#ec4899', S: '#fce7f3', A: '#db2777' },
    width: 8, height: 11,
    frames: [
      [' DS  SD ', ' DB  BD ', ' DB  BD ', 'DBBBBBD ', 'DBSESBD ', 'DBBBBBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DS  SD ', ' DB  BD ', ' DB  BD ', 'DBBBBBD ', 'DBSESBD ', 'DBBBBBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DS  SD ', ' DB  BD ', ' DB  BD ', 'DBBBBBD ', 'DBSESBD ', 'DBBBBBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  ghost: {
    // clean dome shape, X eyes, wavy hem that alternates for walk
    colors: { D: '#334155', B: '#cbd5e1', E: '#1e293b', S: '#f1f5f9', A: '#64748b' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DSSSD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', 'DSSSSSD ', 'DSSSSSSD', 'D S S SD', '        ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', 'DSSSSSD ', ' DSSSSD ', '  DS SD ', '        ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', 'DSSSSSD ', 'DSSSSSSD', 'DS S S D', '        ', '        '],
    ],
  },

  owl: {
    // huge eyes dominate, ear tufts, wide round body
    colors: { D: '#111', B: '#78350f', E: '#fbbf24', S: '#fef3c7', A: '#d97706' },
    width: 8, height: 10,
    frames: [
      [' D    D ', 'DBBBBBD ', 'DASASD  ', 'DAESAED ', 'DSSSSSD ', ' DAABD  ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' D    D ', 'DBBBBBD ', 'DASASD  ', 'DAESAED ', 'DSSSSSD ', ' DAABD  ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' D    D ', 'DBBBBBD ', 'DASASD  ', 'DAESAED ', 'DSSSSSD ', ' DAABD  ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  bear: {
    // round ears as filled semicircles flush with head top, pale muzzle disc
    colors: { D: '#111', B: '#92400e', E: '#fff', S: '#fbbf24', A: '#451a03' },
    width: 8, height: 10,
    frames: [
      [' DB BD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DASAD  ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DB BD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DASAD  ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DB BD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DASAD  ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  frog: {
    // bulging eyes ON TOP of head, wide smiling face, squat body
    colors: { D: '#111', B: '#22c55e', E: '#fff', S: '#bbf7d0', A: '#15803d' },
    width: 8, height: 10,
    frames: [
      ['DEBBBBED', 'DBBBBBD ', 'DSSSSSD ', 'DB A ABD', 'DSSSSSD ', ' DBBBD  ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['DEBBBBED', 'DBBBBBD ', 'DSSSSSD ', 'DB A ABD', 'DSSSSSD ', ' DBBBD  ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['DEBBBBED', 'DBBBBBD ', 'DSSSSSD ', 'DB A ABD', 'DSSSSSD ', ' DBBBD  ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  // ── 8 New sprites ─────────────────────────────────────────────────────────────

  penguin: {
    // tuxedo — black sides, white face + belly, orange beak + feet
    colors: { D: '#0f172a', B: '#0f172a', E: '#f8fafc', S: '#f8fafc', A: '#f97316' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DSSSD  ', 'DBSSSBD ', 'DBSASD  ', 'DB AABD ', ' DSSSD  ', 'DBSSSBD ', 'DBBBBBD ', 'DAD DAD ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DBSSSBD ', 'DBSASD  ', 'DB AABD ', ' DSSSD  ', 'DBSSSBD ', 'DBBBBBD ', 'DAD  A  ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DBSSSBD ', 'DBSASD  ', 'DB AABD ', ' DSSSD  ', 'DBSSSBD ', 'DBBBBBD ', ' A  DAD ', '        '],
    ],
  },

  alien: {
    // huge teardrop head, antennae, giant oval eyes, tiny body
    colors: { D: '#111', B: '#4ade80', E: '#111', S: '#dcfce7', A: '#86efac' },
    width: 8, height: 10,
    frames: [
      [' D   D  ', ' DB DBD ', ' DBBBD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' D   D  ', ' DB DBD ', ' DBBBD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' D   D  ', ' DB DBD ', ' DBBBD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  dragon: {
    // horns, scales, glowing ember eyes, dark body with gold belly
    colors: { D: '#111', B: '#7f1d1d', E: '#fbbf24', S: '#fde68a', A: '#b91c1c' },
    width: 8, height: 10,
    frames: [
      ['D  D  D ', ' DBBBD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D  D  D ', ' DBBBD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D  D  D ', ' DBBBD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  fox: {
    // orange with white muzzle, pointed ears with inner colour, bushy tail hint
    colors: { D: '#111', B: '#ea580c', E: '#fff', S: '#fed7aa', A: '#7c2d12' },
    width: 8, height: 10,
    frames: [
      ['D     D ', 'DA   AD ', 'DBBBBBD ', 'DBBBBBD ', 'DBSESBD ', 'DBSSSD  ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D     D ', 'DA   AD ', 'DBBBBBD ', 'DBBBBBD ', 'DBSESBD ', 'DBSSSD  ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D     D ', 'DA   AD ', 'DBBBBBD ', 'DBBBBBD ', 'DBSESBD ', 'DBSSSD  ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  wizard: {
    // tall pointy hat, beard, robe — uses height 12
    colors: { D: '#111', B: '#7c3aed', E: '#fbbf24', S: '#ddd6fe', A: '#4c1d95' },
    width: 8, height: 12,
    frames: [
      ['   D    ', '  DBD   ', ' DBBBD  ', 'DBBBBBD ', 'DSSSSSD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['   D    ', '  DBD   ', ' DBBBD  ', 'DBBBBBD ', 'DSSSSSD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['   D    ', '  DBD   ', ' DBBBD  ', 'DBBBBBD ', 'DSSSSSD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  ninja: {
    // all dark with glowing red eyes, headband stripe
    colors: { D: '#0f0f0f', B: '#1e1b4b', E: '#ef4444', S: '#3730a3', A: '#ef4444' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DBSSSBD ', 'DB E EBD', 'DBBBBBD ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DBSSSBD ', 'DB E EBD', 'DBBBBBD ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DBSSSBD ', 'DB E EBD', 'DBBBBBD ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  dino: {
    // green dino, spiky ridge on back (top rows), round snout
    colors: { D: '#111', B: '#16a34a', E: '#fff', S: '#86efac', A: '#15803d' },
    width: 8, height: 10,
    frames: [
      ['D D D   ', 'DBBBBBD ', 'DBBBBBD ', 'DBBSSBD ', 'DB E BD ', 'DBBSSBD ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D D D   ', 'DBBBBBD ', 'DBBBBBD ', 'DBBSSBD ', 'DB E BD ', 'DBBSSBD ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D D D   ', 'DBBBBBD ', 'DBBBBBD ', 'DBBSSBD ', 'DB E BD ', 'DBBSSBD ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

  astronaut: {
    // big round helmet with visor, white suit, flag patch
    colors: { D: '#111', B: '#f1f5f9', E: '#38bdf8', S: '#cbd5e1', A: '#0284c7' },
    width: 8, height: 10,
    frames: [
      [' DDDDDD ', 'DBBBBBD ', 'DBAABBD ', 'DBAAABS ', 'DBAAABD ', 'DBBBBBD ', ' DSSSD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'DBAABBD ', 'DBAAABS ', 'DBAAABD ', 'DBBBBBD ', ' DSSSD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'DBAABBD ', 'DBAAABS ', 'DBAAABD ', 'DBBBBBD ', ' DSSSD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },

}

// Map agent IDs and icons to sprite types
function getSpriteType(agentId: string, icon: string, spriteType?: string): keyof typeof SPRITES {
  if (spriteType && SPRITES[spriteType as keyof typeof SPRITES]) return spriteType as keyof typeof SPRITES
  if (agentId === 'task-monitor')      return 'dog'
  if (agentId === 'calendar-agent')    return 'cat'
  if (agentId === 'focus-agent')       return 'robot'
  if (agentId === 'routine-agent')     return 'bunny'
  if (agentId === 'meeting-countdown') return 'owl'
  if (agentId === 'end-of-day')        return 'bear'
  if (agentId === 'stale-task-cleanup')return 'ghost'
  if (agentId === 'hydration-reminder')return 'frog'
  if (agentId === 'break-reminder')    return 'bunny'
  // dynamic agents: pick from icon or hash the id
  const iconMap: Record<string, keyof typeof SPRITES> = {
    '🐱':'cat','🐶':'dog','🤖':'robot','🐰':'bunny','👻':'ghost',
    '🦉':'owl','🐻':'bear','🐸':'frog','🐧':'penguin','👽':'alien',
    '🐉':'dragon','🦊':'fox','🧙':'wizard','🥷':'ninja','🦕':'dino','👨‍🚀':'astronaut',
  }
  if (iconMap[icon]) return iconMap[icon]
  const types = Object.keys(SPRITES) as (keyof typeof SPRITES)[]
  const idx = agentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % types.length
  return types[idx]
}

// ── Pixel sprite renderer ──────────────────────────────────────────────────────

export const PX = 4  // each pixel = 4px

export function PixelSprite({ sprite, frameIdx, flip }: {
  sprite:   Sprite
  frameIdx: number
  flip:     boolean
}) {
  const frame  = sprite.frames[frameIdx]
  const width  = sprite.width  * PX
  const height = sprite.height * PX

  return (
    <svg
      width={width}
      height={height}
      style={{
        imageRendering: 'pixelated',
        transform:      flip ? 'scaleX(-1)' : undefined,
        display:        'block',
      }}
    >
      {frame.map((row, ry) =>
        row.split('').map((ch, rx) => {
          if (ch === ' ') return null
          const color = sprite.colors[ch] ?? ch
          return (
            <rect
              key={`${rx},${ry}`}
              x={rx * PX} y={ry * PX}
              width={PX} height={PX}
              fill={color}
            />
          )
        })
      )}
    </svg>
  )
}

// ── Single walking pet ─────────────────────────────────────────────────────────

interface AgentInfo { id: string; name: string; icon: string; description: string; spriteType?: string }

interface WalkingPetProps {
  agent:         AgentInfo
  mood:          string
  message:       string | null
  onMessageDone: () => void
  onInspect:     () => void
  inspecting:    boolean
}

function WalkingPet({ agent, mood, message, onMessageDone, onInspect, inspecting }: WalkingPetProps) {
  const spriteType   = getSpriteType(agent.id, agent.icon, agent.spriteType)
  const sprite       = SPRITES[spriteType]
  const spriteWidth  = sprite.width  * PX
  const spriteHeight = sprite.height * PX

  const [x,        setX]        = useState(() => Math.random() * (window.innerWidth - spriteWidth - 32))
  const [dir,      setDir]      = useState<1 | -1>(() => Math.random() > 0.5 ? 1 : -1)
  const [frame,    setFrame]    = useState(0)
  const [walking,  setWalking]  = useState(true)
  const [jumping,  setJumping]  = useState(false)

  const msgTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const xRef           = useRef(x)
  const dirRef         = useRef(dir)
  const walkingRef     = useRef(walking)
  const inspectingRef  = useRef(inspecting)
  const moodRef        = useRef(mood)
  xRef.current        = x
  dirRef.current      = dir
  walkingRef.current  = walking
  inspectingRef.current = inspecting
  moodRef.current     = mood

  const speed = useRef(0.035 + Math.random() * 0.03)  // px per ms, unique per pet

  // Random idle pauses
  function scheduleNextIdle() {
    const delay = 6000 + Math.random() * 10000
    idleTimeoutRef.current = setTimeout(() => {
      setWalking(false)
      const pause = 3000 + Math.random() * 5000
      setTimeout(() => {
        setWalking(true)
        scheduleNextIdle()
      }, pause)
    }, delay)
  }

  // Walk loop
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

    // Frame animation
    const frameTick = setInterval(() => {
      const stopped = !walkingRef.current || moodRef.current === 'speaking' || inspectingRef.current
      if (!stopped) {
        setFrame((f) => f === 1 ? 2 : 1)
      } else {
        setFrame(0)
      }
    }, 480)

    return () => {
      cancelAnimationFrame(raf.id)
      clearInterval(frameTick)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
    }
  }, [])

  // Jump when agent wakes
  useEffect(() => {
    if (mood === 'active') {
      setJumping(true)
      setTimeout(() => setJumping(false), 600)
    }
  }, [mood])

  // Auto-dismiss message
  useEffect(() => {
    if (message) {
      if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current)
      msgTimeoutRef.current = setTimeout(onMessageDone, 5000)
    }
    return () => { if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current) }
  }, [message])

  const isSpeaking = !!message
  const showBubble = isSpeaking || inspecting
  const yOffset    = jumping ? -14 : showBubble ? -4 : 0

  return (
    <div
      style={{
        position:      'fixed',
        bottom:        jumping ? 18 : 14,
        left:          x,
        zIndex:        9980,
        transition:    jumping ? 'bottom 0.15s ease-out' : 'bottom 0.2s ease-in',
        userSelect:    'none',
        pointerEvents: 'auto',
        cursor:        'pointer',
      }}
      onClick={onInspect}
      title={agent.name}
    >
      {/* Bubble — either spoken message or inspect card */}
      {showBubble && (
        <div
          style={{
            position:        'absolute',
            bottom:          spriteHeight + 6,
            left:            '50%',
            transform:       'translateX(-50%)',
            width:           190,
            padding:         '8px 10px',
            borderRadius:    10,
            fontSize:        11,
            lineHeight:      1.45,
            backgroundColor: 'var(--wt-settings-bg)',
            border:          '1px solid var(--wt-settings-border)',
            backdropFilter:  'var(--wt-backdrop)',
            boxShadow:       'var(--wt-shadow-lg)',
            color:           'var(--wt-text)',
            animation:       'petPopIn 0.15s cubic-bezier(0.34,1.56,0.64,1)',
            whiteSpace:      'normal',
            pointerEvents:   'none',
          }}
        >
          <strong style={{ display: 'block', fontSize: 10, marginBottom: 3, color: 'var(--wt-accent)' }}>
            {agent.icon} {agent.name}
          </strong>
          <span style={{ opacity: 0.75 }}>
            {inspecting && !isSpeaking ? agent.description : message}
          </span>
          {/* Tail */}
          <div style={{
            position:    'absolute',
            bottom:      -5,
            left:        Math.min(Math.max(spriteWidth / 2, 16), 174),
            width:       8, height: 8,
            background:  'var(--wt-settings-bg)',
            border:      '1px solid var(--wt-settings-border)',
            borderTop:   'none', borderLeft: 'none',
            transform:   'rotate(45deg)',
          }} />
        </div>
      )}

      {/* Sprite */}
      <div
        style={{
          transform:  `translateY(${yOffset}px)`,
          transition: 'transform 0.1s ease',
          filter:     showBubble
            ? `drop-shadow(0 0 6px ${sprite.colors.B}bb)`
            : mood === 'active'
            ? `drop-shadow(0 0 8px ${sprite.colors.B}cc)`
            : 'none',
        }}
      >
        <PixelSprite sprite={sprite} frameIdx={frame} flip={dir === -1} />
      </div>
    </div>
  )
}

// ── PetBar ─────────────────────────────────────────────────────────────────────

export function PetBar() {
  const [agents,     setAgents]     = useState<AgentInfo[]>([])
  const [inspecting, setInspecting] = useState<string | null>(null)
  const { pets, clearMessage } = usePetsStore()

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data: AgentInfo[]) => setAgents(data))
      .catch(() => {})
  }, [])

  // Click outside to close inspect
  useEffect(() => {
    if (!inspecting) return
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-pet]')) setInspecting(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [inspecting])

  return (
    <>
      {agents.map((agent) => (
        <div key={agent.id} data-pet={agent.id}>
          <WalkingPet
            agent={agent}
            mood={pets[agent.id]?.mood ?? 'idle'}
            message={pets[agent.id]?.message ?? null}
            onMessageDone={() => clearMessage(agent.id)}
            inspecting={inspecting === agent.id}
            onInspect={() => setInspecting((prev) => prev === agent.id ? null : agent.id)}
          />
        </div>
      ))}
    </>
  )
}
