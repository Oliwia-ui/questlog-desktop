import { contextBridge, ipcRenderer } from 'electron'
import type { CreateQuestRequest, QuestLogApi, UpdateQuestRequest } from '../shared/state'

const questLog: QuestLogApi = {
  loadState: () => ipcRenderer.invoke('questlog:load'),
  createQuest: (input: CreateQuestRequest) => ipcRenderer.invoke('questlog:create', input),
  updateQuest: (input: UpdateQuestRequest) => ipcRenderer.invoke('questlog:update', input),
  completeQuest: (id: string) => ipcRenderer.invoke('questlog:complete', id),
  reopenQuest: (id: string) => ipcRenderer.invoke('questlog:reopen', id),
  deleteQuest: (id: string) => ipcRenderer.invoke('questlog:delete', id),
  selectVault: () => ipcRenderer.invoke('questlog:select-vault'),
  retryLogs: () => ipcRenderer.invoke('questlog:retry-logs'),
  showDataFolder: () => ipcRenderer.invoke('questlog:show-data-folder')
}

if (!process.contextIsolated) throw new Error('QuestLog requires context isolation.')
contextBridge.exposeInMainWorld('questLog', questLog)
