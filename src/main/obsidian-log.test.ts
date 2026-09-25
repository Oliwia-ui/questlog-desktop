import { afterEach, describe, expect, it } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { appendTaskEvent, formatTaskEvent, taskHistoryPath } from './obsidian-log'
import type { TaskEvent } from '../shared/state'

const root = join(process.cwd(), '.test-vault')

const event: TaskEvent = {
  id: 'event-123',
  type: 'TASK_EDITED',
  timestamp: '2026-09-25T10:15:30+02:00',
  task: {
    id: '123e4567-e89b-42d3-a456-426614174000',
    title: 'Prototype flow',
    description: 'Five tasks',
    course: 'Interaction Design',
    dueDate: '2026-09-27',
    important: true,
    status: 'active',
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:15:30.000Z',
    completedAt: null
  },
  changedFields: ['title', 'important']
}

afterEach(async () => rm(root, { recursive: true, force: true }))

describe('Obsidian task history', () => {
  it('formats required event data and selects the local event month path', () => {
    expect(taskHistoryPath(root, event)).toBe(join(root, 'QuestLog', 'Task History', '2026-09.md'))
    const markdown = formatTaskEvent(event)
    expect(markdown).toContain('<!-- questlog-event:event-123 -->')
    expect(markdown).toContain('## TASK_EDITED — 2026-09-25T10:15:30+02:00')
    expect(markdown).toContain('- **Status:** active')
    expect(markdown).toContain('- **Task ID:** `123e4567-e89b-42d3-a456-426614174000`')
    expect(markdown).toContain('- **Changed fields:** title, important')
    expect(markdown).toContain('- **Due date:** 2026-09-27')
  })

  it('appends an event once and treats its event ID as idempotent on retry', async () => {
    expect(await appendTaskEvent(root, event)).toEqual({ appended: true })
    expect(await appendTaskEvent(root, event)).toEqual({ appended: false })
    const markdown = await readFile(taskHistoryPath(root, event), 'utf8')
    expect(markdown.match(/questlog-event:event-123/g)).toHaveLength(1)
  })

  it('includes the final task snapshot when a task is deleted', () => {
    const markdown = formatTaskEvent({ ...event, type: 'TASK_DELETED', changedFields: undefined })
    expect(markdown).toContain('### Final task snapshot')
    expect(markdown).toContain('"title": "Prototype flow"')
  })
})
