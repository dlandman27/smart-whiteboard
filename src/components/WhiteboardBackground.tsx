import React from 'react'

interface Props {
  bg:  string
  dot: string
  children: React.ReactNode
}

export function WhiteboardBackground({ bg, dot, children }: Props) {
  return (
    <div
      className="relative w-screen h-screen"
      style={{
        backgroundColor: bg,
        backgroundSize: '28px 28px',
        backgroundImage: `radial-gradient(circle, ${dot} 1.5px, transparent 1.5px)`,
      }}
    >
      {children}
    </div>
  )
}
