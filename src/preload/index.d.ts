import type { QuestLogApi } from '../shared/state'

declare global {
  interface Window {
    questLog: QuestLogApi
  }
}

export {}
