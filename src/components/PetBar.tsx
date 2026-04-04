import { useEffect, useState } from 'react'
import { usePetsStore } from '../store/pets'
import { WalkingPet, type AgentInfo } from './pets/WalkingPet'

// Re-exports for consumers (SettingsPanel etc.)
export { SPRITES, PX } from './pets/sprites'
export { PixelSprite } from './pets/PixelSprite'

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

  useEffect(() => {
    if (!inspecting) return
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-pet]')) setInspecting(null)
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
