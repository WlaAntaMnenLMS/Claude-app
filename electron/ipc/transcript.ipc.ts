import { ipcMain, app, BrowserWindow } from 'electron'
import { getDb } from '../services/db.service'
import path from 'path'
import fs from 'fs'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

export function registerTranscriptIpc() {
  const db = () => getDb()

  // ─── TRANSCRIPT TEMPLATES ────────────────────────────────────────────────────
  ipcMain.handle('transcriptTemplate:list', () =>
    db().prepare('SELECT * FROM transcript_templates ORDER BY name ASC').all()
  )

  ipcMain.handle('transcriptTemplate:upload', async (_e, data: any) => {
    const dir = path.join(app.getPath('userData'), 'transcript-templates')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const dest = path.join(dir, `${Date.now()}_${path.basename(data.sourcePath)}`)
    fs.copyFileSync(data.sourcePath, dest)

    let variables: string[] = []
    try {
      const content = fs.readFileSync(dest, 'binary')
      const zip = new PizZip(content)
      const text = zip.file('word/document.xml')?.asText() || ''
      const matches = text.match(/\{\{(\w+)\}\}/g) || []
      variables = [...new Set(matches.map((m: string) => m.slice(2, -2)))]
    } catch {}

    const r = db().prepare(`
      INSERT INTO transcript_templates (name, docx_path, variables)
      VALUES (@name, @docx_path, @variables)
    `).run({ name: data.name, docx_path: dest, variables: JSON.stringify(variables) })
    return db().prepare('SELECT * FROM transcript_templates WHERE id = ?').get(r.lastInsertRowid)
  })

  ipcMain.handle('transcriptTemplate:delete', (_e, id: number) => {
    db().prepare('DELETE FROM transcript_templates WHERE id = ?').run(id)
    return { success: true }
  })

  // ─── TRANSCRIPTS ─────────────────────────────────────────────────────────────
  ipcMain.handle('transcript:list', () =>
    db().prepare(`
      SELECT t.*, l.full_name as learner_name, tt.name as template_name
      FROM transcripts t
      LEFT JOIN learners l ON t.learner_id = l.id
      LEFT JOIN transcript_templates tt ON t.template_id = tt.id
      ORDER BY t.created_at DESC
    `).all()
  )

  ipcMain.handle('transcript:create', async (_e, data: any) => {
    // data: { template_id, learner_id, courses_data: [{course_name, code, grade, hours, completion_date}] }
    const template = db().prepare('SELECT * FROM transcript_templates WHERE id = ?').get(data.template_id) as any
    const learner = db().prepare('SELECT * FROM learners WHERE id = ?').get(data.learner_id) as any
    if (!template || !learner) throw new Error('Template or learner not found')

    const outputDir = path.join(app.getPath('documents'), 'LD-Assistant', 'Transcripts',
      new Date().toISOString().split('T')[0])
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    const safeName = learner.full_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const outputPath = path.join(outputDir, `${safeName}_transcript.docx`)

    const courses = data.courses_data

    // Use docxtemplater loop syntax: {#courses} ... {/courses}
    const templateVars = {
      learner_name: learner.full_name,
      national_id: learner.national_id || '',
      email: learner.email || '',
      organization: learner.organization || '',
      issue_date: new Date().toLocaleDateString('en-GB'),
      courses,
      total_hours: courses.reduce((sum: number, c: any) => sum + (Number(c.hours) || 0), 0),
    }

    const content = fs.readFileSync(template.docx_path, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(templateVars)
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    fs.writeFileSync(outputPath, buf)

    const r = db().prepare(`
      INSERT INTO transcripts (template_id, learner_id, courses_data, output_path)
      VALUES (@template_id, @learner_id, @courses_data, @output_path)
    `).run({
      template_id: data.template_id,
      learner_id: data.learner_id,
      courses_data: JSON.stringify(courses),
      output_path: outputPath,
    })
    return db().prepare('SELECT * FROM transcripts WHERE id = ?').get(r.lastInsertRowid)
  })

  ipcMain.handle('transcript:bulkFill', async (_e, data: any) => {
    // data: { entries: [{template_id, learner_id, courses_data}] }
    const results: any[] = []
    for (const entry of data.entries) {
      try {
        const result = await (ipcMain as any).emit('transcript:create', null, entry)
        results.push({ success: true, ...result })
      } catch (err: any) {
        results.push({ success: false, error: err.message })
      }
    }
    return results
  })
}
