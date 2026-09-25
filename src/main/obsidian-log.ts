import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { TaskEvent } from '../shared/state'

function escaped(value: string): string {
  return value.replaceAll('`', '\\`').replaceAll('\n', ' ')
}

export function taskHistoryPath(vaultPath: string, event: TaskEvent): string {
  return join(vaultPath, 'QuestLog', 'Task History', `${event.timestamp.slice(0, 7)}.md`)
}

export function formatTaskEvent(event: TaskEvent): string {
  const task = event.task
  const lines = [
    `<!-- questlog-event:${event.id} -->`,
    `## ${event.type} — ${event.timestamp}`,
    '',
    `- **Event ID:** \`${event.id}\``,
    `- **Status:** ${task.status}`,
    `- **Task ID:** \`${task.id}\``,
    `- **Title:** ${escaped(task.title)}`
  ]
  if (task.course) lines.push(`- **Course/module:** ${escaped(task.course)}`)
  if (task.dueDate) lines.push(`- **Due date:** ${task.dueDate}`)
  if (event.changedFields?.length) lines.push(`- **Changed fields:** ${event.changedFields.join(', ')}`)
  if (event.type === 'TASK_DELETED') {
    lines.push('', '### Final task snapshot', '', '```json', JSON.stringify(task, null, 2), '```')
  }
  lines.push('', '---', '')
  return `${lines.join('\n')}\n`
}

export async function appendTaskEvent(
  vaultPath: string,
  event: TaskEvent
): Promise<{ appended: boolean }> {
  const filePath = taskHistoryPath(vaultPath, event)
  const marker = `<!-- questlog-event:${event.id} -->`
  await mkdir(dirname(filePath), { recursive: true })
  try {
    const existing = await readFile(filePath, 'utf8')
    if (existing.includes(marker)) return { appended: false }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  await appendFile(filePath, formatTaskEvent(event), 'utf8')
  return { appended: true }
}

export function formatLocalIso(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}
