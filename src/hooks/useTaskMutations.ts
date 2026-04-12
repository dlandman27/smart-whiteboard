import { getTaskProviders } from '../providers'
import type { UnifiedTask } from '../types/unified'

// ── Mutation helpers (plain async functions, not hooks) ──────────────────────

/**
 * Toggle the completed state of a task, routing to the correct provider.
 */
export async function toggleUnifiedTask(task: UnifiedTask): Promise<void> {
  const provider = getTaskProviders().find(p => p.id === task.source.provider)
  if (!provider?.toggleTask) {
    throw new Error(`Provider "${task.source.provider}" does not support toggling tasks`)
  }
  await provider.toggleTask(task)
}

/**
 * Delete a task, routing to the correct provider.
 */
export async function deleteUnifiedTask(task: UnifiedTask): Promise<void> {
  const provider = getTaskProviders().find(p => p.id === task.source.provider)
  if (!provider?.deleteTask) {
    throw new Error(`Provider "${task.source.provider}" does not support deleting tasks`)
  }
  await provider.deleteTask(task)
}

/**
 * Create a new task group (list/project) in the specified provider.
 */
export async function createUnifiedGroup(
  providerId: string,
  name: string,
): Promise<void> {
  const provider = getTaskProviders().find(p => p.id === providerId)
  if (!provider?.createGroup) {
    throw new Error(`Provider "${providerId}" does not support creating groups`)
  }
  await provider.createGroup(name)
}

/**
 * Create a new task in the specified provider and group.
 */
export async function createUnifiedTask(
  providerId: string,
  groupId: string,
  task: { title: string; notes?: string; due?: string; priority?: number },
): Promise<void> {
  const provider = getTaskProviders().find(p => p.id === providerId)
  if (!provider?.createTask) {
    throw new Error(`Provider "${providerId}" does not support creating tasks`)
  }
  await provider.createTask(groupId, task)
}
