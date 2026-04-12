import { getEventProviders } from '../providers'
import type { UnifiedEvent } from '../types/unified'

// ── Mutation helpers (plain async functions, not hooks) ──────────────────────

/**
 * Create a new event in the specified provider and group (calendar).
 */
export async function createUnifiedEvent(
  providerId: string,
  groupId: string,
  event: {
    title: string
    description?: string
    location?: string
    start: string
    end?: string
    allDay?: boolean
  },
): Promise<void> {
  const provider = getEventProviders().find(p => p.id === providerId)
  if (!provider?.createEvent) {
    throw new Error(`Provider "${providerId}" does not support creating events`)
  }
  await provider.createEvent(groupId, event)
}

/**
 * Delete an event, routing to the correct provider.
 */
export async function deleteUnifiedEvent(event: UnifiedEvent): Promise<void> {
  const provider = getEventProviders().find(p => p.id === event.source.provider)
  if (!provider?.deleteEvent) {
    throw new Error(`Provider "${event.source.provider}" does not support deleting events`)
  }
  await provider.deleteEvent(event)
}
