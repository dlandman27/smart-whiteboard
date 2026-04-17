import { supabaseAdmin } from '../../lib/supabase.js'
import { broadcast } from '../../ws.js'
import type { VoiceTool } from './_types.js'

export const taskTools: VoiceTool[] = [
  {
    definition: {
      name: 'add_task',
      description: 'Add a task to a wiigit task list. Use this for all "add to my tasks/todos/shopping list/etc." requests — NOT Notion. list_name defaults to "My Tasks" if the user doesn\'t specify a list.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:     { type: 'string', description: 'Task title' },
          list_name: { type: 'string', description: 'Task list name (e.g. "My Tasks", "Shopping List"). Default: "My Tasks"' },
          priority:  { type: 'number', description: '1=urgent 2=high 3=medium 4=low. Default: 4' },
          due:       { type: 'string', description: 'Due date as ISO 8601, e.g. "2026-04-20T00:00:00Z"' },
          notes:     { type: 'string', description: 'Optional notes or details' },
        },
        required: ['title'],
      },
    },
    execute: async (input, { userId }) => {
      const { title, list_name = 'My Tasks', priority = 4, due, notes } = input as {
        title: string; list_name?: string; priority?: number; due?: string; notes?: string
      }
      const { error } = await supabaseAdmin
        .from('tasks')
        .insert({ user_id: userId, title, list_name, priority, due: due ?? null, notes: notes ?? null })
      if (error) return `Failed to add task: ${error.message}`
      broadcast({ type: 'tasks_invalidate', listName: list_name })
      return `Added "${title}" to ${list_name}`
    },
  },

  {
    definition: {
      name: 'list_tasks',
      description: 'Read out tasks from a wiigit task list. Use for "what\'s on my list", "read me my tasks", "what\'s on my shopping list", etc.',
      input_schema: {
        type: 'object' as const,
        properties: {
          list_name:   { type: 'string', description: 'Task list name. Omit to read from "My Tasks".' },
          status:      { type: 'string', enum: ['needsAction', 'completed'], description: 'Filter by status. Omit to return only incomplete tasks.' },
          limit:       { type: 'number', description: 'Max items to return (default 10)' },
        },
        required: [],
      },
    },
    execute: async (input, { userId }) => {
      const { list_name, status = 'needsAction', limit = 10 } = input as {
        list_name?: string; status?: string; limit?: number
      }
      let query = supabaseAdmin
        .from('tasks')
        .select('title, priority, due, status')
        .eq('user_id', userId)
        .eq('status', status)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (list_name) query = query.eq('list_name', list_name)

      const { data, error } = await query
      if (error) return `Failed to fetch tasks: ${error.message}`
      if (!data?.length) return list_name ? `Nothing on your ${list_name}.` : 'No tasks found.'

      return data.map((t: any, i: number) => `${i + 1}. ${t.title}`).join('. ')
    },
  },

  {
    definition: {
      name: 'complete_task',
      description: 'Mark a task as done by searching for it by title. Use for "mark X as done", "complete X", "check off X".',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:     { type: 'string', description: 'Task title to search for (partial match OK)' },
          list_name: { type: 'string', description: 'Optional: narrow search to this list' },
        },
        required: ['title'],
      },
    },
    execute: async (input, { userId }) => {
      const { title, list_name } = input as { title: string; list_name?: string }
      let query = supabaseAdmin
        .from('tasks')
        .select('id, title, list_name')
        .eq('user_id', userId)
        .eq('status', 'needsAction')
        .ilike('title', `%${title}%`)
        .limit(1)

      if (list_name) query = query.eq('list_name', list_name)

      const { data, error } = await query
      if (error) return `Failed to search tasks: ${error.message}`
      if (!data?.length) return `Couldn't find a task matching "${title}".`

      const task = data[0] as any
      const { error: updateError } = await supabaseAdmin
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', task.id)
        .eq('user_id', userId)

      if (updateError) return `Failed to complete task: ${updateError.message}`
      broadcast({ type: 'tasks_invalidate', listName: task.list_name })
      return `Done — marked "${task.title}" as complete.`
    },
  },

  {
    definition: {
      name: 'list_task_lists',
      description: 'List all wiigit task lists the user has. Use when the user asks "what lists do I have" or you need to find the right list name.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    execute: async (_input, { userId }) => {
      const { data, error } = await supabaseAdmin
        .from('task_lists')
        .select('name, color')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) return `Failed to fetch lists: ${error.message}`
      const names = ['My Tasks', ...(data ?? []).map((r: any) => r.name).filter((n: string) => n !== 'My Tasks')]
      return names.join(', ')
    },
  },

  {
    definition: {
      name: 'create_task_list',
      description: 'Create a new wiigit task list. Use when the user says "create a list called X" or "make a shopping list".',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Name for the new list' },
        },
        required: ['name'],
      },
    },
    execute: async (input, { userId }) => {
      const { name } = input as { name: string }
      const { error } = await supabaseAdmin
        .from('task_lists')
        .insert({ user_id: userId, name: name.trim() })

      if (error) {
        if (error.code === '23505') return `You already have a list called "${name}".`
        return `Failed to create list: ${error.message}`
      }
      broadcast({ type: 'tasks_invalidate' })
      return `Created list "${name}".`
    },
  },
]
