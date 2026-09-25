import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { AtomicJsonStore } from './atomic-json-store'

const root = join(process.cwd(), '.test-data-atomic')

afterEach(async () => rm(root, { recursive: true, force: true }))

describe('AtomicJsonStore', () => {
  it('round-trips JSON through replacement without leaving temporary files', async () => {
    await mkdir(root, { recursive: true })
    const store = new AtomicJsonStore<{ count: number }>(join(root, 'state.json'), { count: 0 })
    await store.save({ count: 1 })
    await store.save({ count: 2 })

    expect(await store.load()).toEqual({ count: 2 })
    expect(JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))).toEqual({ count: 2 })
    expect((await readdir(root)).filter((name) => name.includes('.tmp'))).toEqual([])
  })

  it('returns the default state when the file does not exist', async () => {
    const store = new AtomicJsonStore(join(root, 'missing.json'), { quests: [] })
    expect(await store.load()).toEqual({ quests: [] })
  })
})
