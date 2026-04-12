import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'

export function registerSearchIpc() {
  const db = getDb()

  ipcMain.handle('search:global', (_e, query: string) => {
    if (!query || query.trim().length < 2) return []
    const q = `%${query.trim()}%`
    const results: any[] = []

    // Instructors
    const instructors = db.prepare(`
      SELECT id, full_name as title, COALESCE(specialization, email, '') as subtitle,
             'instructor' as type, status, '/instructors' as route
      FROM instructors
      WHERE full_name LIKE ? OR email LIKE ? OR specialization LIKE ? OR notes LIKE ?
      LIMIT 5
    `).all(q, q, q, q)
    results.push(...instructors)

    // Demo sessions
    const demos = db.prepare(`
      SELECT d.id, i.full_name as title, COALESCE(d.topic, d.location, '') as subtitle,
             'demo' as type, d.status, '/demos' as route
      FROM demo_sessions d
      LEFT JOIN instructors i ON d.instructor_id = i.id
      WHERE i.full_name LIKE ? OR d.topic LIKE ? OR d.location LIKE ?
      LIMIT 5
    `).all(q, q, q)
    results.push(...demos)

    // Proposals
    const proposals = db.prepare(`
      SELECT p.id, p.title, COALESCE(c.name, p.program_name, '') as subtitle,
             'proposal' as type, p.status, '/proposals' as route
      FROM proposals p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.title LIKE ? OR p.program_name LIKE ? OR c.name LIKE ?
      LIMIT 5
    `).all(q, q, q)
    results.push(...proposals)

    // Proposal templates
    const propTemplates = db.prepare(`
      SELECT id, name as title, '' as subtitle,
             'proposal_template' as type, 'template' as status, '/proposals' as route
      FROM proposal_templates
      WHERE name LIKE ? OR content LIKE ?
      LIMIT 3
    `).all(q, q)
    results.push(...propTemplates)

    // Certificates
    const certs = db.prepare(`
      SELECT c.id, l.full_name as title, c.course_name as subtitle,
             'certificate' as type, c.cert_number as status, '/certificates' as route
      FROM certificates c
      LEFT JOIN learners l ON c.learner_id = l.id
      WHERE l.full_name LIKE ? OR c.course_name LIKE ? OR c.cert_number LIKE ?
      LIMIT 5
    `).all(q, q, q)
    results.push(...certs)

    // Certificate templates
    const certTemplates = db.prepare(`
      SELECT id, name as title, '' as subtitle,
             'cert_template' as type, 'template' as status, '/certificates' as route
      FROM cert_templates
      WHERE name LIKE ?
      LIMIT 3
    `).all(q)
    results.push(...certTemplates)

    // Transcript templates
    const txTemplates = db.prepare(`
      SELECT id, name as title, '' as subtitle,
             'transcript_template' as type, 'template' as status, '/transcripts' as route
      FROM transcript_templates
      WHERE name LIKE ?
      LIMIT 3
    `).all(q)
    results.push(...txTemplates)

    // Learners
    const learners = db.prepare(`
      SELECT id, full_name as title, COALESCE(organization, email, '') as subtitle,
             'learner' as type, '' as status, '/certificates' as route
      FROM learners
      WHERE full_name LIKE ? OR email LIKE ? OR national_id LIKE ? OR organization LIKE ?
      LIMIT 5
    `).all(q, q, q, q)
    results.push(...learners)

    // Communication templates
    const commTemplates = db.prepare(`
      SELECT id, name as title, channel as subtitle,
             'comm_template' as type, category as status, '/communications' as route
      FROM communication_templates
      WHERE name LIKE ? OR body LIKE ?
      LIMIT 3
    `).all(q, q)
    results.push(...commTemplates)

    return results
  })
}
