import type { EditableQuestField, Quest } from './domain'

export type TaskEventType =
  | 'TASK_CREATED'
  | 'TASK_EDITED'
  | 'TASK_COMPLETED'
  | 'TASK_REOPENED'
  | 'TASK_DELETED'

export interface TaskEvent {
  id: string
  type: TaskEventType
  timestamp: string
  task: Quest
  changedFields?: EditableQuestField[]
}

export interface AppSettings {
  vaultPath: string | null
}

export interface AppState {
  version: 1
  quests: Quest[]
  settings: AppSettings
  pendingLogEvents: TaskEvent[]
  loggedEventIds: string[]
}

export const emptyAppState: AppState = {
  version: 1,
  quests: [],
  settings: { vaultPath: null },
  pendingLogEvents: [],
  loggedEventIds: []
}

export interface AppSnapshot extends AppState {
  dataFilePath: string
}

export interface CreateQuestRequest {
  title: string
  description: string
  course: string
  dueDate: string | null
  important: boolean
}

export interface UpdateQuestRequest extends CreateQuestRequest {
  id: string
}

export interface MutationResult {
  state: AppSnapshot
  warning: string | null
}

export interface QuestLogApi {
  loadState(): Promise<AppSnapshot>
  createQuest(input: CreateQuestRequest): Promise<MutationResult>
  updateQuest(input: UpdateQuestRequest): Promise<MutationResult>
  completeQuest(id: string): Promise<MutationResult>
  reopenQuest(id: string): Promise<MutationResult>
  deleteQuest(id: string): Promise<MutationResult>
  selectVault(): Promise<AppSnapshot>
  retryLogs(): Promise<MutationResult>
  showDataFolder(): Promise<void>
}
