import { ipcMain, app } from 'electron'
import { getDb } from '../services/db.service'
import path from 'path'
import fs from 'fs'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

export function registerProposalIpc() {
  const db = () => getDb()

  // ─── CLIENTS ────────────────────────────────────────────────────────────────
  ipcMain.handle('client:list', () =>
    db().prepare('SELECT * FROM clients ORDER BY name ASC').all()
  )
  ipcMain.handle('client:create', (_e, data: any) => {
    const r = db().prepare(`
      INSERT INTO clients (name, contact, email, phone, industry, notes)
      VALUES (@name, @contact, @email, @phone, @industry, @notes)
    `).run(data)
    return db().prepare('SELECT * FROM clients WHERE id = ?').get(r.lastInsertRowid)
  })
  ipcMain.handle('client:update', (_e, id: number, data: any) => {
    const fields = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ')
    db().prepare(`UPDATE clients SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db().prepare('SELECT * FROM clients WHERE id = ?').get(id)
  })
  ipcMain.handle('client:delete', (_e, id: number) => {
    db().prepare('DELETE FROM clients WHERE id = ?').run(id)
    return { success: true }
  })

  // ─── TEMPLATES ───────────────────────────────────────────────────────────────
  ipcMain.handle('proposalTemplate:list', () =>
    db().prepare('SELECT * FROM proposal_templates ORDER BY name ASC').all()
  )
  ipcMain.handle('proposalTemplate:create', (_e, data: any) => {
    // Auto-detect {{variables}} in content
    const vars = [...new Set((data.content.match(/\{\{(\w+)\}\}/g) || []).map((m: string) => m.slice(2, -2)))]
    const r = db().prepare(`
      INSERT INTO proposal_templates (name, content, variables)
      VALUES (@name, @content, @variables)
    `).run({ name: data.name, content: data.content, variables: JSON.stringify(vars) })
    return db().prepare('SELECT * FROM proposal_templates WHERE id = ?').get(r.lastInsertRowid)
  })
  ipcMain.handle('proposalTemplate:update', (_e, id: number, data: any) => {
    const vars = [...new Set((data.content.match(/\{\{(\w+)\}\}/g) || []).map((m: string) => m.slice(2, -2)))]
    db().prepare(`
      UPDATE proposal_templates SET name = @name, content = @content, variables = @variables, updated_at = unixepoch()
      WHERE id = @id
    `).run({ id, name: data.name, content: data.content, variables: JSON.stringify(vars) })
    return db().prepare('SELECT * FROM proposal_templates WHERE id = ?').get(id)
  })
  ipcMain.handle('proposalTemplate:delete', (_e, id: number) => {
    db().prepare('DELETE FROM proposal_templates WHERE id = ?').run(id)
    return { success: true }
  })

  // ─── PROPOSALS ───────────────────────────────────────────────────────────────
  ipcMain.handle('proposal:list', () =>
    db().prepare(`
      SELECT p.*, c.name as client_name
      FROM proposals p LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
    `).all()
  )
  ipcMain.handle('proposal:get', (_e, id: number) =>
    db().prepare(`
      SELECT p.*, c.name as client_name
      FROM proposals p LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = ?
    `).get(id)
  )
  ipcMain.handle('proposal:create', (_e, data: any) => {
    const r = db().prepare(`
      INSERT INTO proposals (client_id, template_id, title, program_name, content, variables_data, status)
      VALUES (@client_id, @template_id, @title, @program_name, @content, @variables_data, 'draft')
    `).run({
      client_id: data.client_id || null,
      template_id: data.template_id || null,
      title: data.title,
      program_name: data.program_name || null,
      content: data.content,
      variables_data: JSON.stringify(data.variables_data || {}),
    })
    return db().prepare('SELECT * FROM proposals WHERE id = ?').get(r.lastInsertRowid)
  })
  ipcMain.handle('proposal:update', (_e, id: number, data: any) => {
    db().prepare(`
      UPDATE proposals SET title = @title, program_name = @program_name,
        content = @content, variables_data = @variables_data,
        status = @status, updated_at = unixepoch()
      WHERE id = @id
    `).run({
      id,
      title: data.title,
      program_name: data.program_name || null,
      content: data.content,
      variables_data: JSON.stringify(data.variables_data || {}),
      status: data.status || 'draft',
    })
    return db().prepare('SELECT * FROM proposals WHERE id = ?').get(id)
  })
  ipcMain.handle('proposal:delete', (_e, id: number) => {
    db().prepare('DELETE FROM proposals WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('proposal:export', async (_e, id: number, format: 'docx' | 'pdf') => {
    const proposal = db().prepare('SELECT * FROM proposals WHERE id = ?').get(id) as any
    if (!proposal) throw new Error('Proposal not found')

    const outputDir = path.join(app.getPath('documents'), 'LD-Assistant', 'Proposals')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    const safeName = proposal.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')
    const outputPath = path.join(outputDir, `${safeName}.${format}`)

    if (format === 'docx') {
      // Use docxtemplater with a simple blank docx template
      const templatePath = path.join(__dirname, '../../assets/templates/default_proposal.docx')
      if (fs.existsSync(templatePath)) {
        const content = fs.readFileSync(templatePath, 'binary')
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
        const varsData = JSON.parse(proposal.variables_data || '{}')
        doc.render({ ...varsData, content: proposal.content, title: proposal.title })
        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
        fs.writeFileSync(outputPath, buf)
      } else {
        // Fallback: write plain text as docx (not ideal but works)
        fs.writeFileSync(outputPath, proposal.content)
      }
    }

    db().prepare('UPDATE proposals SET output_path = ? WHERE id = ?').run(outputPath, id)
    return { outputPath }
  })
}
