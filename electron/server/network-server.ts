import express from 'express'
import cors from 'cors'
import { Server } from 'http'
import { getDb } from '../services/db.service'

let server: Server | null = null
let currentPort = 4765

export function startNetworkServer(port: number, pin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (server) stopNetworkServer()

    const app = express()
    app.use(cors())
    app.use(express.json())

    // PIN auth middleware
    app.use((req, res, next) => {
      if (req.path === '/ping') return next()
      const auth = req.headers['x-pin']
      if (auth !== pin) return res.status(401).json({ error: 'Invalid PIN' })
      next()
    })

    // Health check — used by clients to verify connection
    app.get('/ping', (_req, res) => res.json({ ok: true, app: 'LD-Assistant' }))

    const db = getDb()

    // ── Instructors ──────────────────────────────────────────────────
    app.get('/instructor/list', (_req, res) => {
      const rows = db.prepare(`SELECT i.*, COUNT(d.id) as demo_count FROM instructors i LEFT JOIN demo_sessions d ON d.instructor_id = i.id GROUP BY i.id ORDER BY i.created_at DESC`).all()
      res.json(rows)
    })
    app.post('/instructor/create', (req, res) => {
      const d = req.body
      const r = db.prepare(`INSERT INTO instructors (full_name, email, phone, specialization, linkedin_url, status, notes) VALUES (?,?,?,?,?,?,?)`).run(d.full_name, d.email, d.phone, d.specialization, d.linkedin_url, d.status || 'applied', d.notes)
      res.json({ id: r.lastInsertRowid })
    })
    app.put('/instructor/update/:id', (req, res) => {
      const d = req.body; const id = Number(req.params.id)
      const fields = Object.keys(d).map(k => `${k} = @${k}`).join(', ')
      db.prepare(`UPDATE instructors SET ${fields}, updated_at = unixepoch() WHERE id = @id`).run({ ...d, id })
      res.json({ success: true })
    })
    app.delete('/instructor/delete/:id', (req, res) => {
      db.prepare(`DELETE FROM demo_sessions WHERE instructor_id = ?`).run(Number(req.params.id))
      db.prepare(`DELETE FROM instructors WHERE id = ?`).run(Number(req.params.id))
      res.json({ success: true })
    })

    // ── Demo Sessions ─────────────────────────────────────────────────
    app.get('/demo/list', (_req, res) => {
      const rows = db.prepare(`SELECT d.*, i.full_name as instructor_name FROM demo_sessions d LEFT JOIN instructors i ON d.instructor_id = i.id ORDER BY d.scheduled_at DESC`).all()
      res.json(rows)
    })
    app.post('/demo/create', (req, res) => {
      const d = req.body
      const r = db.prepare(`INSERT INTO demo_sessions (instructor_id, scheduled_at, duration_mins, location, topic, status) VALUES (?,?,?,?,?,?)`).run(d.instructor_id, d.scheduled_at, d.duration_mins || 60, d.location, d.topic, 'scheduled')
      if (d.instructor_id) db.prepare(`UPDATE instructors SET status='demo_scheduled', updated_at=unixepoch() WHERE id=?`).run(d.instructor_id)
      res.json({ id: r.lastInsertRowid })
    })
    app.put('/demo/update/:id', (req, res) => {
      const d = req.body; const id = Number(req.params.id)
      const fields = Object.keys(d).map(k => `${k} = @${k}`).join(', ')
      db.prepare(`UPDATE demo_sessions SET ${fields} WHERE id = @id`).run({ ...d, id })
      res.json({ success: true })
    })
    app.get('/demo/upcoming', (_req, res) => {
      const now = Math.floor(Date.now() / 1000)
      const in7d = now + 7 * 24 * 3600
      const rows = db.prepare(`SELECT d.*, i.full_name as instructor_name FROM demo_sessions d LEFT JOIN instructors i ON d.instructor_id = i.id WHERE d.status = 'scheduled' AND d.scheduled_at BETWEEN ? AND ? ORDER BY d.scheduled_at`).all(now, in7d)
      res.json(rows)
    })

    // ── Proposals ────────────────────────────────────────────────────
    app.get('/proposal/list', (_req, res) => {
      const rows = db.prepare(`SELECT p.*, c.name as client_name, t.name as template_name FROM proposals p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN proposal_templates t ON p.template_id = t.id ORDER BY p.created_at DESC`).all()
      res.json(rows)
    })
    app.get('/client/list', (_req, res) => res.json(db.prepare(`SELECT * FROM clients ORDER BY name`).all()))
    app.get('/proposalTemplate/list', (_req, res) => res.json(db.prepare(`SELECT * FROM proposal_templates ORDER BY name`).all()))

    // ── Learners + Certificates ──────────────────────────────────────
    app.get('/learner/list', (_req, res) => res.json(db.prepare(`SELECT * FROM learners ORDER BY full_name`).all()))
    app.get('/certificate/list', (_req, res) => {
      const rows = db.prepare(`SELECT c.*, l.full_name as learner_name, t.name as template_name FROM certificates c LEFT JOIN learners l ON c.learner_id = l.id LEFT JOIN cert_templates t ON c.template_id = t.id ORDER BY c.created_at DESC`).all()
      res.json(rows)
    })
    app.get('/certTemplate/list', (_req, res) => res.json(db.prepare(`SELECT * FROM cert_templates ORDER BY name`).all()))

    // ── Transcripts ──────────────────────────────────────────────────
    app.get('/transcript/list', (_req, res) => {
      const rows = db.prepare(`SELECT t.*, l.full_name as learner_name FROM transcripts t LEFT JOIN learners l ON t.learner_id = l.id ORDER BY t.created_at DESC`).all()
      res.json(rows)
    })

    // ── Communication Templates ──────────────────────────────────────
    app.get('/communication/list', (_req, res) => res.json(db.prepare(`SELECT * FROM communication_templates ORDER BY category, name`).all()))

    // ── Global Search ────────────────────────────────────────────────
    app.post('/search', (req, res) => {
      const { query } = req.body
      if (!query || query.length < 2) return res.json([])
      const q = `%${query}%`
      const results: any[] = []
      const instructors = db.prepare(`SELECT id, full_name as title, email as subtitle, 'instructor' as type, status FROM instructors WHERE full_name LIKE ? OR email LIKE ? OR specialization LIKE ? LIMIT 5`).all(q, q, q)
      instructors.forEach((r: any) => results.push(r))
      const proposals = db.prepare(`SELECT p.id, p.title, c.name as subtitle, 'proposal' as type, p.status FROM proposals p LEFT JOIN clients c ON p.client_id = c.id WHERE p.title LIKE ? OR p.program_name LIKE ? LIMIT 5`).all(q, q)
      proposals.forEach((r: any) => results.push(r))
      const demos = db.prepare(`SELECT d.id, i.full_name as title, d.topic as subtitle, 'demo' as type, d.status FROM demo_sessions d LEFT JOIN instructors i ON d.instructor_id = i.id WHERE i.full_name LIKE ? OR d.topic LIKE ? LIMIT 5`).all(q, q)
      demos.forEach((r: any) => results.push(r))
      const certs = db.prepare(`SELECT c.id, l.full_name as title, c.course_name as subtitle, 'certificate' as type, c.cert_number as status FROM certificates c LEFT JOIN learners l ON c.learner_id = l.id WHERE l.full_name LIKE ? OR c.course_name LIKE ? LIMIT 5`).all(q, q)
      certs.forEach((r: any) => results.push(r))
      res.json(results)
    })

    currentPort = port
    server = app.listen(port, '0.0.0.0', () => {
      const os = require('os')
      const nets = os.networkInterfaces()
      let ip = 'localhost'
      for (const iface of Object.values(nets) as any[]) {
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) { ip = addr.address; break }
        }
      }
      resolve(`http://${ip}:${port}`)
    })
    server.on('error', reject)
  })
}

export function stopNetworkServer() {
  if (server) { server.close(); server = null }
}

export function getServerPort() { return currentPort }
export function isServerRunning() { return server !== null }
