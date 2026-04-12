import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'

export function registerCommunicationIpc() {
  const db = getDb()

  ipcMain.handle('comm:list', () =>
    db.prepare(`SELECT * FROM communication_templates ORDER BY category, name`).all()
  )

  ipcMain.handle('comm:create', (_e, data: {
    name: string; channel: string; subject?: string; body: string; variables?: string; category?: string
  }) => {
    const vars = data.variables ?? JSON.stringify(extractVars(data.body))
    const r = db.prepare(`
      INSERT INTO communication_templates (name, channel, subject, body, variables, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.name, data.channel, data.subject ?? null, data.body, vars, data.category ?? null)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('comm:update', (_e, id: number, data: any) => {
    if (data.body) data.variables = JSON.stringify(extractVars(data.body))
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
    db.prepare(`UPDATE communication_templates SET ${fields}, updated_at = unixepoch() WHERE id = ?`)
      .run(...Object.values(data), id)
    return { success: true }
  })

  ipcMain.handle('comm:delete', (_e, id: number) => {
    db.prepare(`DELETE FROM communication_templates WHERE id = ?`).run(id)
    return { success: true }
  })

  // Render a template with actual values
  ipcMain.handle('comm:render', (_e, templateId: number, vars: Record<string, string>) => {
    const tpl = db.prepare(`SELECT * FROM communication_templates WHERE id = ?`).get(templateId) as any
    if (!tpl) return { error: 'Template not found' }
    let body = tpl.body
    let subject = tpl.subject ?? ''
    for (const [k, v] of Object.entries(vars)) {
      body = body.replaceAll(`{{${k}}}`, v)
      subject = subject.replaceAll(`{{${k}}}`, v)
    }
    return { body, subject, channel: tpl.channel }
  })

  // Log a sent communication
  ipcMain.handle('comm:logSent', (_e, data: {
    template_id?: number; recipient: string; channel: string; subject?: string; message: string
  }) => {
    db.prepare(`INSERT INTO communications_sent (template_id, recipient, channel, subject, message) VALUES (?,?,?,?,?)`)
      .run(data.template_id ?? null, data.recipient, data.channel, data.subject ?? null, data.message)
    return { success: true }
  })

  ipcMain.handle('comm:sentHistory', () =>
    db.prepare(`SELECT s.*, t.name as template_name FROM communications_sent s LEFT JOIN communication_templates t ON s.template_id = t.id ORDER BY s.sent_at DESC LIMIT 100`).all()
  )
}

function extractVars(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) ?? []
  return [...new Set(matches.map(m => m.slice(2, -2)))]
}
