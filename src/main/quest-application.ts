import { completeQuest, createQuest, editQuest, reopenQuest, type Quest } from '../shared/domain'
import type {
  AppSnapshot,
  AppState,
  CreateQuestRequest,
  MutationResult,
  TaskEvent,
  TaskEventType,
  UpdateQuestRequest
} from '../shared/state'
import type { JsonStore } from './atomic-json-store'
import { formatLocalIso } from './obsidian-log'

export interface EventAppender {
  append(vaultPath: string, event: TaskEvent): Promise<unknown>
}

export interface ApplicationDependencies {
  uuid(): string
  eventId(): string
  now(): Date
}

export class QuestApplication {
  constructor(
    private readonly store: JsonStore<AppState>,
    private readonly eventAppender: EventAppender,
    private readonly dependencies: ApplicationDependencies,
    private readonly dataFilePath: string
  ) {}

  async loadState(): Promise<AppSnapshot> {
    return this.snapshot(await this.store.load())
  }

  async createQuest(input: CreateQuestRequest): Promise<MutationResult> {
    const state = await this.store.load()
    const now = this.dependencies.now()
    const quest = createQuest(input, { id: this.dependencies.uuid, now: () => now })
    state.quests.push(quest)
    return this.persistThenLog(state, this.event('TASK_CREATED', quest, now))
  }

  async updateQuest(input: UpdateQuestRequest): Promise<MutationResult> {
    const state = await this.store.load()
    const index = this.questIndex(state, input.id)
    const now = this.dependencies.now()
    const result = editQuest(state.quests[index], input, now)
    if (!result.changedFields.length) return { state: this.snapshot(state), warning: null }
    state.quests[index] = result.quest
    return this.persistThenLog(state, {
      ...this.event('TASK_EDITED', result.quest, now),
      changedFields: result.changedFields
    })
  }

  async completeQuest(id: string): Promise<MutationResult> {
    return this.transition(id, 'TASK_COMPLETED', completeQuest)
  }

  async reopenQuest(id: string): Promise<MutationResult> {
    return this.transition(id, 'TASK_REOPENED', reopenQuest)
  }

  async deleteQuest(id: string): Promise<MutationResult> {
    const state = await this.store.load()
    const index = this.questIndex(state, id)
    const task = state.quests[index]
    state.quests.splice(index, 1)
    return this.persistThenLog(state, this.event('TASK_DELETED', task, this.dependencies.now()))
  }

  async setVaultPath(vaultPath: string): Promise<AppSnapshot> {
    const state = await this.store.load()
    state.settings.vaultPath = vaultPath
    await this.store.save(state)
    return this.snapshot(state)
  }

  async retryLogs(): Promise<MutationResult> {
    const state = await this.store.load()
    if (!state.settings.vaultPath) {
      return { state: this.snapshot(state), warning: state.pendingLogEvents.length ? 'Select an Obsidian vault before retrying.' : null }
    }
    const remaining: TaskEvent[] = []
    let failed = 0
    for (const event of state.pendingLogEvents) {
      if (state.loggedEventIds.includes(event.id)) continue
      try {
        await this.eventAppender.append(state.settings.vaultPath, event)
        state.loggedEventIds.push(event.id)
      } catch {
        remaining.push(event)
        failed += 1
      }
    }
    state.pendingLogEvents = remaining
    await this.store.save(state)
    return {
      state: this.snapshot(state),
      warning: failed ? `${failed} history event${failed === 1 ? '' : 's'} still could not be written.` : null
    }
  }

  private async transition(
    id: string,
    type: Extract<TaskEventType, 'TASK_COMPLETED' | 'TASK_REOPENED'>,
    change: (quest: Quest, now: Date) => Quest
  ): Promise<MutationResult> {
    const state = await this.store.load()
    const index = this.questIndex(state, id)
    const before = state.quests[index]
    const now = this.dependencies.now()
    const after = change(before, now)
    if (after === before) return { state: this.snapshot(state), warning: null }
    state.quests[index] = after
    return this.persistThenLog(state, this.event(type, after, now))
  }

  private async persistThenLog(state: AppState, event: TaskEvent): Promise<MutationResult> {
    await this.store.save(state)
    if (!state.settings.vaultPath) {
      state.pendingLogEvents.push(event)
      await this.store.save(state)
      return { state: this.snapshot(state), warning: 'History event queued. Select an Obsidian vault to write it.' }
    }
    try {
      await this.eventAppender.append(state.settings.vaultPath, event)
      if (!state.loggedEventIds.includes(event.id)) state.loggedEventIds.push(event.id)
      await this.store.save(state)
      return { state: this.snapshot(state), warning: null }
    } catch {
      if (!state.pendingLogEvents.some((pending) => pending.id === event.id)) state.pendingLogEvents.push(event)
      await this.store.save(state)
      return { state: this.snapshot(state), warning: 'The quest was saved, but its history event could not be written and is queued for retry.' }
    }
  }

  private event(type: TaskEventType, task: Quest, now: Date): TaskEvent {
    return { id: this.dependencies.eventId(), type, timestamp: formatLocalIso(now), task: structuredClone(task) }
  }

  private questIndex(state: AppState, id: string): number {
    const index = state.quests.findIndex((quest) => quest.id === id)
    if (index < 0) throw new Error('Quest not found.')
    return index
  }

  private snapshot(state: AppState): AppSnapshot {
    return { ...structuredClone(state), dataFilePath: this.dataFilePath }
  }
}
