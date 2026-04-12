import { ipcMain, shell } from 'electron'
import {
  exportInstructors, exportDemos, exportProposals,
  exportCertificates, exportLearners, exportTranscripts
} from '../services/excel.service'

export function registerExportIpc() {
  const handlers: Record<string, () => Promise<string>> = {
    instructors: exportInstructors,
    demos:       exportDemos,
    proposals:   exportProposals,
    certificates: exportCertificates,
    learners:    exportLearners,
    transcripts: exportTranscripts,
  }

  ipcMain.handle('export:toExcel', async (_e, module: string) => {
    const fn = handlers[module]
    if (!fn) return { success: false, error: `Unknown module: ${module}` }
    try {
      const filePath = await fn()
      return { success: true, filePath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('export:openFile', async (_e, filePath: string) => {
    await shell.openPath(filePath)
  })
}
