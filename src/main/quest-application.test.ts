import { describe, expect, it } from 'vitest'
import { QuestApplication } from './quest-application'
import { emptyAppState, type AppState, type TaskEvent } from '../shared/state'

class MemoryStore {
  state: AppState = structuredClone(emptyAppState)
  saves: AppState[] = []
  async load(): Promise<AppState> {
    return structuredClone(this.state)
  }
  async save(state: AppState): Promise<void> {
    this.state = structuredClone(state)
    this.saves.push(structuredClone(state))
  }
}

describe('QuestApplication mutation and logging', () => {
  it('persists the local mutation before attempting its history append', async () => {
    const store = new MemoryStore()
    store.state.settings.vaultPath = '/vault'
    const observed: string[] = []
    const app = new QuestApplication(store, {
      append: async (_vault: string, event: TaskEvent) => {
        observed.push(`${store.state.quests.length}:${event.type}`)
      }
    }, { uuid: () => 'task-id', eventId: () => 'event-id', now: () => new Date('2026-09-25T08:00:00Z') }, '/data/state.json')

    const result = await app.createQuest({
      title: 'Build prototype', description: '', course: 'Interaction Design', dueDate: null, important: false
    })

    expect(observed).toEqual(['1:TASK_CREATED'])
    expect(result.state.quests[0].id).toBe('task-id')
    expect(result.warning).toBeNull()
  })

  it('keeps a successful mutation and queues a failed append persistently', async () => {
    const store = new MemoryStore()
    store.state.settings.vaultPath = '/missing-vault'
    const app = new QuestApplication(store, { append: async () => { throw new Error('unavailable') } },
      { uuid: () => 'task-id', eventId: () => 'event-id', now: () => new Date('2026-09-25T08:00:00Z') }, '/data/state.json')

    const result = await app.createQuest({
      title: 'Write report', description: '', course: '', dueDate: null, important: true
    })

    expect(result.state.quests).toHaveLength(1)
    expect(result.state.pendingLogEvents.map((event) => event.id)).toEqual(['event-id'])
    expect(result.warning).toContain('could not be written')
    expect(store.state.pendingLogEvents).toHaveLength(1)
  })

  it('retries queued events and relies on event IDs for exactly-once append behavior', async () => {
    const store = new MemoryStore()
    store.state.settings.vaultPath = '/vault'
    store.state.pendingLogEvents = [{
      id: 'event-id', type: 'TASK_CREATED', timestamp: '2026-09-25T10:00:00+02:00',
      task: {
        id: 'task-id', title: 'Write report', description: '', course: '', dueDate: null, important: false,
        status: 'active', createdAt: '2026-09-25T08:00:00.000Z', updatedAt: '2026-09-25T08:00:00.000Z', completedAt: null
      }
    }]
    const appended: string[] = []
    const app = new QuestApplication(store, { append: async (_vault, event) => { appended.push(event.id) } },
      { uuid: () => 'task-id', eventId: () => 'event-next', now: () => new Date('2026-09-25T08:00:00Z') }, '/data/state.json')

    const first = await app.retryLogs()
    const second = await app.retryLogs()

    expect(appended).toEqual(['event-id'])
    expect(first.state.pendingLogEvents).toEqual([])
    expect(first.state.loggedEventIds).toContain('event-id')
    expect(second.warning).toBeNull()
  })
})
