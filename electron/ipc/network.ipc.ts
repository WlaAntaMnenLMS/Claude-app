import { ipcMain, BrowserWindow } from 'electron'
import { startNetworkServer, stopNetworkServer, isServerRunning } from '../server/network-server'
import { getDb } from '../services/db.service'

export function registerNetworkIpc(win: BrowserWindow | null) {
  const db = getDb()

  ipcMain.handle('network:getSettings', () => {
    return db.prepare(`SELECT * FROM network_settings LIMIT 1`).get()
  })

  ipcMain.handle('network:saveSettings', (_e, data: { mode: string; server_port?: number; server_pin?: string; server_host?: string }) => {
    db.prepare(`UPDATE network_settings SET mode=?, server_port=?, server_pin=?, server_host=?, updated_at=unixepoch()`)
      .run(data.mode, data.server_port ?? 4765, data.server_pin ?? null, data.server_host ?? null)
    return { success: true }
  })

  ipcMain.handle('network:startServer', async (_e, port: number, pin: string) => {
    try {
      const url = await startNetworkServer(port, pin)
      return { success: true, url }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('network:stopServer', () => {
    stopNetworkServer()
    return { success: true }
  })

  ipcMain.handle('network:isRunning', () => isServerRunning())

  // Test connection to a remote server using Node's built-in http
  ipcMain.handle('network:testConnection', (_e, host: string, port: number) => {
    return new Promise(resolve => {
      const http = require('http')
      const req = http.get({ host, port, path: '/ping', timeout: 3000 }, (res: any) => {
        resolve({ success: res.statusCode === 200 })
      })
      req.on('error', () => resolve({ success: false, error: 'Cannot reach server. Check IP and port.' }))
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Connection timed out.' }) })
    })
  })
}
