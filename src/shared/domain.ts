export type QuestStatus = 'active' | 'completed'

export interface Quest {
  id: string
  title: string
  description: string
  course: string
  dueDate: string | null
  important: boolean
  status: QuestStatus
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface QuestInput {
  title: string
  description?: string
  course?: string
  dueDate?: string | null
  important?: boolean
}

export type EditableQuestField = 'title' | 'description' | 'course' | 'dueDate' | 'important'

export interface DomainDependencies {
  id: () => string
  now: () => Date
}

const editableFields: EditableQuestField[] = ['title', 'description', 'course', 'dueDate', 'important']

export function createQuest(input: QuestInput, dependencies: DomainDependencies): Quest {
  const title = input.title.trim()
  if (!title) throw new Error('A quest title is required.')
  const timestamp = dependencies.now().toISOString()
  return {
    id: dependencies.id(),
    title,
    description: input.description?.trim() ?? '',
    course: input.course?.trim() ?? '',
    dueDate: input.dueDate || null,
    important: input.important ?? false,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null
  }
}

export function editQuest(
  quest: Quest,
  updates: Partial<QuestInput>,
  now: Date
): { quest: Quest; changedFields: EditableQuestField[] } {
  const next: Quest = {
    ...quest,
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
    ...(updates.course !== undefined ? { course: updates.course.trim() } : {}),
    ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate || null } : {}),
    ...(updates.important !== undefined ? { important: updates.important } : {})
  }
  if (!next.title) throw new Error('A quest title is required.')
  const changedFields = editableFields.filter((field) => next[field] !== quest[field])
  return {
    quest: changedFields.length ? { ...next, updatedAt: now.toISOString() } : quest,
    changedFields
  }
}

export function completeQuest(quest: Quest, now: Date): Quest {
  if (quest.status === 'completed') return quest
  const timestamp = now.toISOString()
  return { ...quest, status: 'completed', completedAt: timestamp, updatedAt: timestamp }
}

export function reopenQuest(quest: Quest, now: Date): Quest {
  if (quest.status === 'active') return quest
  return { ...quest, status: 'active', completedAt: null, updatedAt: now.toISOString() }
}

export interface QuestFilters {
  query?: string
  course?: string
  status?: QuestStatus | 'all'
}

export function filterQuests(quests: Quest[], filters: QuestFilters): Quest[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? ''
  return quests.filter((quest) => {
    const matchesQuery = !query || `${quest.title} ${quest.description}`.toLocaleLowerCase().includes(query)
    const matchesCourse = !filters.course || filters.course === 'all' || quest.course === filters.course
    const matchesStatus = !filters.status || filters.status === 'all' || quest.status === filters.status
    return matchesQuery && matchesCourse && matchesStatus
  })
}

export function getTodaysJourney(quests: Quest[], localDate: string): Quest[] {
  return quests
    .filter(
      (quest) =>
        quest.status === 'active' &&
        (quest.important || (quest.dueDate !== null && quest.dueDate <= localDate))
    )
    .sort((left, right) => {
      const leftDue = left.dueDate ?? '9999-12-31'
      const rightDue = right.dueDate ?? '9999-12-31'
      return leftDue.localeCompare(rightDue) || Number(right.important) - Number(left.important)
    })
}

export function questReference(quest: Quest): string {
  return `${quest.id} · ${quest.title}`
}

export function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
