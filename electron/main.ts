import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import path from 'path'
import { getDb } from './services/db.service'
import { registerInstructorIpc } from './ipc/instructor.ipc'
import { registerDemoIpc } from './ipc/demo.ipc'
import { registerProposalIpc } from './ipc/proposal.ipc'
import { registerCertificateIpc } from './ipc/certificate.ipc'
import { registerTranscriptIpc } from './ipc/transcript.ipc'
import { registerDoxxIpc } from './ipc/doxx.ipc'
import { registerAgentIpc } from './ipc/agent.ipc'
import { registerAuthIpc } from './ipc/auth.ipc'
import { registerNetworkIpc } from './ipc/network.ipc'
import { registerSearchIpc } from './ipc/search.ipc'
import { registerCommunicationIpc } from './ipc/communication.ipc'
import { registerExportIpc } from './ipc/export.ipc'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f172a',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  getDb()

  registerInstructorIpc()
  registerDemoIpc(mainWindow)
  registerProposalIpc()
  registerCertificateIpc()
  registerTranscriptIpc()
  registerDoxxIpc()
  registerAgentIpc()
  registerAuthIpc()
  registerNetworkIpc(mainWindow)
  registerSearchIpc()
  registerCommunicationIpc()
  registerExportIpc()

  ipcMain.handle('shell:openPath', async (_e, filePath: string) => { await shell.openPath(filePath) })
  ipcMain.handle('shell:showItemInFolder', async (_e, filePath: string) => { shell.showItemInFolder(filePath) })

  createWindow()

  checkUpcomingDemos()
  setInterval(checkUpcomingDemos, 5 * 60 * 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function checkUpcomingDemos() {
  try {
    const db = getDb()
    const now = Math.floor(Date.now() / 1000)
    const in24h = now + 24 * 60 * 60
    const upcoming = db.prepare(`
      SELECT d.*, i.full_name
      FROM demo_sessions d JOIN instructors i ON d.instructor_id = i.id
      WHERE d.status = 'scheduled' AND d.scheduled_at BETWEEN ? AND ?
    `).all(now, in24h) as any[]
    for (const demo of upcoming) {
      const mins = Math.floor((demo.scheduled_at - now) / 60)
      if (mins <= 60 && Notification.isSupported()) {
        new Notification({
          title: 'Upcoming Demo Session',
          body: `Demo with ${demo.full_name} in ${mins} minutes — ${demo.topic || 'No topic set'}`,
        }).show()
      }
    }
  } catch (err) { console.error('Demo check error:', err) }
}
