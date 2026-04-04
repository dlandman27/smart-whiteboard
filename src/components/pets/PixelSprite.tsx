import { PX, type Sprite } from './sprites'

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
      style={{ imageRendering: 'pixelated', transform: flip ? 'scaleX(-1)' : undefined, display: 'block' }}
    >
      {frame.map((row, ry) =>
        row.split('').map((ch, rx) => {
          if (ch === ' ') return null
          const color = sprite.colors[ch] ?? ch
          return <rect key={`${rx},${ry}`} x={rx * PX} y={ry * PX} width={PX} height={PX} fill={color} />
        })
      )}
    </svg>
  )
}
