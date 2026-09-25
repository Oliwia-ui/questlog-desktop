import { describe, expect, it } from 'vitest'
import {
  completeQuest,
  createQuest,
  editQuest,
  filterQuests,
  getTodaysJourney,
  reopenQuest
} from './domain'

const now = new Date('2026-09-25T10:15:00+02:00')

function makeQuest() {
  return createQuest(
    {
      title: 'Prototype usability flow',
      description: 'Prepare tasks and observation prompts',
      course: 'Interaction Design',
      dueDate: '2026-09-25',
      important: false
    },
    { id: () => '123e4567-e89b-42d3-a456-426614174000', now: () => now }
  )
}

describe('quest lifecycle', () => {
  it('creates a stable active quest and preserves its identity through completion and reopening', () => {
    const quest = makeQuest()
    expect(quest).toEqual({
      id: '123e4567-e89b-42d3-a456-426614174000',
      title: 'Prototype usability flow',
      description: 'Prepare tasks and observation prompts',
      course: 'Interaction Design',
      dueDate: '2026-09-25',
      important: false,
      status: 'active',
      createdAt: '2026-09-25T08:15:00.000Z',
      updatedAt: '2026-09-25T08:15:00.000Z',
      completedAt: null
    })

    const completed = completeQuest(quest, new Date('2026-09-25T12:00:00+02:00'))
    expect(completed.status).toBe('completed')
    expect(completed.completedAt).toBe('2026-09-25T10:00:00.000Z')

    const reopened = reopenQuest(completed, new Date('2026-09-25T12:30:00+02:00'))
    expect(reopened.id).toBe(quest.id)
    expect(reopened.status).toBe('active')
    expect(reopened.completedAt).toBeNull()
  })

  it('edits fields and reports only changed fields', () => {
    const result = editQuest(
      makeQuest(),
      { title: 'Test prototype flow', important: true, course: 'UX Studio' },
      new Date('2026-09-25T11:00:00+02:00')
    )
    expect(result.changedFields).toEqual(['title', 'course', 'important'])
    expect(result.quest.title).toBe('Test prototype flow')
    expect(result.quest.updatedAt).toBe('2026-09-25T09:00:00.000Z')
  })
})

describe('quest discovery', () => {
  it('searches title and description and filters by course and status', () => {
    const active = makeQuest()
    const completed = completeQuest(
      createQuest(
        {
          title: 'Reading notes',
          description: 'Affinity mapping chapter',
          course: 'Design Research',
          dueDate: null,
          important: false
        },
        { id: () => '223e4567-e89b-42d3-a456-426614174000', now: () => now }
      ),
      now
    )
    expect(filterQuests([active, completed], { query: 'observation', course: 'Interaction Design', status: 'active' })).toEqual([active])
    expect(filterQuests([active, completed], { query: 'affinity', course: 'all', status: 'completed' })).toEqual([completed])
  })

  it('builds Today’s Journey from overdue, due-today, and important active quests', () => {
    const dueToday = makeQuest()
    const overdue = { ...makeQuest(), id: 'overdue', dueDate: '2026-09-24' }
    const important = { ...makeQuest(), id: 'important', dueDate: '2026-10-01', important: true }
    const later = { ...makeQuest(), id: 'later', dueDate: '2026-10-01' }
    const completed = { ...dueToday, id: 'done', status: 'completed' as const }
    expect(getTodaysJourney([later, completed, important, overdue, dueToday], '2026-09-25').map((quest) => quest.id)).toEqual([
      'overdue',
      dueToday.id,
      'important'
    ])
  })
})
