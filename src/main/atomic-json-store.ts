import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface JsonStore<T> {
  load(): Promise<T>
  save(value: T): Promise<void>
}

export class AtomicJsonStore<T> implements JsonStore<T> {
  constructor(
    private readonly filePath: string,
    private readonly defaultValue: T
  ) {}

  async load(): Promise<T> {
    try {
      return JSON.parse(await readFile(this.filePath, 'utf8')) as T
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(this.defaultValue)
      throw error
    }
  }

  async save(value: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`
    try {
      await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
      await rename(temporaryPath, this.filePath)
    } finally {
      await rm(temporaryPath, { force: true })
    }
  }
}
