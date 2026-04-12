import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { getDb } from './db.service'

function getExportDir() {
  const dir = path.join(app.getPath('documents'), 'LD-Assistant', 'Exports')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF2563EB' } } }
  })
  row.height = 28
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let max = 12
    col.eachCell?.({ includeEmpty: true }, cell => {
      const len = cell.value?.toString().length ?? 0
      if (len > max) max = len
    })
    col.width = Math.min(max + 4, 50)
  })
}

function dateFromUnix(ts: number | null) {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleDateString('en-GB')
}

// ─── Instructors ─────────────────────────────────────────────────────────────
export async function exportInstructors(): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT i.*, COUNT(d.id) as demo_count
    FROM instructors i LEFT JOIN demo_sessions d ON d.instructor_id = i.id
    GROUP BY i.id ORDER BY i.status, i.full_name
  `).all() as any[]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'L&D Assistant'; wb.created = new Date()
  const ws = wb.addWorksheet('Instructors')

  ws.columns = [
    { header: 'Name', key: 'full_name' }, { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' }, { header: 'Specialization', key: 'specialization' },
    { header: 'Status', key: 'status' }, { header: 'Rating', key: 'rating' },
    { header: 'Demos', key: 'demo_count' }, { header: 'LinkedIn', key: 'linkedin_url' },
    { header: 'Notes', key: 'notes' }, { header: 'Added', key: 'created_at' },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({ ...r, created_at: dateFromUnix(r.created_at) }))
  autoWidth(ws)

  const file = path.join(getExportDir(), `Instructors_${Date.now()}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}

// ─── Demo Sessions ────────────────────────────────────────────────────────────
export async function exportDemos(): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT d.*, i.full_name as instructor_name
    FROM demo_sessions d LEFT JOIN instructors i ON d.instructor_id = i.id
    ORDER BY d.scheduled_at DESC
  `).all() as any[]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Demo Sessions')
  ws.columns = [
    { header: 'Instructor', key: 'instructor_name' }, { header: 'Date', key: 'scheduled_at' },
    { header: 'Duration (min)', key: 'duration_mins' }, { header: 'Location', key: 'location' },
    { header: 'Topic', key: 'topic' }, { header: 'Status', key: 'status' },
    { header: 'Score', key: 'score' }, { header: 'Feedback', key: 'feedback' },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({ ...r, scheduled_at: dateFromUnix(r.scheduled_at) }))
  autoWidth(ws)

  const file = path.join(getExportDir(), `DemoSessions_${Date.now()}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}

// ─── Proposals ────────────────────────────────────────────────────────────────
export async function exportProposals(): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT p.*, c.name as client_name, t.name as template_name
    FROM proposals p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN proposal_templates t ON p.template_id = t.id
    ORDER BY p.created_at DESC
  `).all() as any[]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Proposals')
  ws.columns = [
    { header: 'Title', key: 'title' }, { header: 'Client', key: 'client_name' },
    { header: 'Program', key: 'program_name' }, { header: 'Template', key: 'template_name' },
    { header: 'Status', key: 'status' }, { header: 'Created', key: 'created_at' },
    { header: 'Updated', key: 'updated_at' },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({ ...r, created_at: dateFromUnix(r.created_at), updated_at: dateFromUnix(r.updated_at) }))
  autoWidth(ws)

  const file = path.join(getExportDir(), `Proposals_${Date.now()}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}

// ─── Certificates ─────────────────────────────────────────────────────────────
export async function exportCertificates(): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.*, l.full_name as learner_name, l.national_id, l.email as learner_email,
           l.organization, t.name as template_name
    FROM certificates c
    LEFT JOIN learners l ON c.learner_id = l.id
    LEFT JOIN cert_templates t ON c.template_id = t.id
    ORDER BY c.created_at DESC
  `).all() as any[]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Certificates')
  ws.columns = [
    { header: 'Learner Name', key: 'learner_name' }, { header: 'National ID', key: 'national_id' },
    { header: 'Email', key: 'learner_email' }, { header: 'Organization', key: 'organization' },
    { header: 'Course', key: 'course_name' }, { header: 'Cert Number', key: 'cert_number' },
    { header: 'Issue Date', key: 'issue_date' }, { header: 'Template', key: 'template_name' },
    { header: 'Created', key: 'created_at' },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({ ...r, created_at: dateFromUnix(r.created_at) }))
  autoWidth(ws)

  const file = path.join(getExportDir(), `Certificates_${Date.now()}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}

// ─── Learners ─────────────────────────────────────────────────────────────────
export async function exportLearners(): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT l.*, COUNT(c.id) as cert_count, COUNT(t.id) as transcript_count
    FROM learners l
    LEFT JOIN certificates c ON c.learner_id = l.id
    LEFT JOIN transcripts t ON t.learner_id = l.id
    GROUP BY l.id ORDER BY l.full_name
  `).all() as any[]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Learners')
  ws.columns = [
    { header: 'Full Name', key: 'full_name' }, { header: 'National ID', key: 'national_id' },
    { header: 'Email', key: 'email' }, { header: 'Phone', key: 'phone' },
    { header: 'Organization', key: 'organization' }, { header: 'Certificates', key: 'cert_count' },
    { header: 'Transcripts', key: 'transcript_count' }, { header: 'Added', key: 'created_at' },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({ ...r, created_at: dateFromUnix(r.created_at) }))
  autoWidth(ws)

  const file = path.join(getExportDir(), `Learners_${Date.now()}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}

// ─── Transcripts ──────────────────────────────────────────────────────────────
export async function exportTranscripts(): Promise<string> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT t.*, l.full_name as learner_name, l.national_id
    FROM transcripts t LEFT JOIN learners l ON t.learner_id = l.id
    ORDER BY t.created_at DESC
  `).all() as any[]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Transcripts')
  ws.columns = [
    { header: 'Learner', key: 'learner_name' }, { header: 'National ID', key: 'national_id' },
    { header: 'Course', key: 'course_name' }, { header: 'Grade', key: 'grade' },
    { header: 'Hours', key: 'hours' }, { header: 'Date', key: 'date' }, { header: 'Created', key: 'created_at' },
  ]
  styleHeader(ws.getRow(1))

  for (const r of rows) {
    const courses = JSON.parse(r.courses_data || '[]')
    for (const c of courses) {
      ws.addRow({ learner_name: r.learner_name, national_id: r.national_id, course_name: c.course_name || c.name, grade: c.grade, hours: c.hours, date: c.completion_date || c.date, created_at: dateFromUnix(r.created_at) })
    }
  }
  autoWidth(ws)

  const file = path.join(getExportDir(), `Transcripts_${Date.now()}.xlsx`)
  await wb.xlsx.writeFile(file)
  return file
}
