import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { AtomicJsonStore } from './atomic-json-store'
import { appendTaskEvent } from './obsidian-log'
import { QuestApplication } from './quest-application'
import { emptyAppState, type CreateQuestRequest, type UpdateQuestRequest } from '../shared/state'

let questApplication: QuestApplication

function registerIpc(): void {
  ipcMain.handle('questlog:load', () => questApplication.loadState())
  ipcMain.handle('questlog:create', (_event, input: CreateQuestRequest) =>
    questApplication.createQuest(input)
  )
  ipcMain.handle('questlog:update', (_event, input: UpdateQuestRequest) =>
    questApplication.updateQuest(input)
  )
  ipcMain.handle('questlog:complete', (_event, id: string) => questApplication.completeQuest(id))
  ipcMain.handle('questlog:reopen', (_event, id: string) => questApplication.reopenQuest(id))
  ipcMain.handle('questlog:delete', (_event, id: string) => questApplication.deleteQuest(id))
  ipcMain.handle('questlog:retry-logs', () => questApplication.retryLogs())
  ipcMain.handle('questlog:select-vault', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose your Obsidian vault',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || !result.filePaths[0]) return questApplication.loadState()
    await questApplication.setVaultPath(result.filePaths[0])
    return (await questApplication.retryLogs()).state
  })
  ipcMain.handle('questlog:show-data-folder', async () => {
    await shell.openPath(app.getPath('userData'))
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: 'QuestLog — Enchanted Archive',
    backgroundColor: '#182019',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.oliwiajasionek.questlog')
  const dataFilePath = join(app.getPath('userData'), 'questlog-state.json')
  questApplication = new QuestApplication(
    new AtomicJsonStore(dataFilePath, emptyAppState),
    { append: appendTaskEvent },
    { uuid: randomUUID, eventId: randomUUID, now: () => new Date() },
    dataFilePath
  )
  registerIpc()

  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
