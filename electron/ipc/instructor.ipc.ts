import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'

export function registerInstructorIpc() {
  const db = () => getDb()

  ipcMain.handle('instructor:list', () => {
    return db().prepare(`
      SELECT i.*,
        (SELECT COUNT(*) FROM demo_sessions d WHERE d.instructor_id = i.id) as demo_count
      FROM instructors i
      ORDER BY i.created_at DESC
    `).all()
  })

  ipcMain.handle('instructor:get', (_e, id: number) => {
    const instructor = db().prepare('SELECT * FROM instructors WHERE id = ?').get(id)
    const demos = db().prepare('SELECT * FROM demo_sessions WHERE instructor_id = ? ORDER BY scheduled_at DESC').all(id)
    return { instructor, demos }
  })

  ipcMain.handle('instructor:create', (_e, data: any) => {
    const stmt = db().prepare(`
      INSERT INTO instructors (full_name, email, phone, specialization, cv_path, linkedin_url, status, notes)
      VALUES (@full_name, @email, @phone, @specialization, @cv_path, @linkedin_url, @status, @notes)
    `)
    const result = stmt.run({
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      specialization: data.specialization || null,
      cv_path: data.cv_path || null,
      linkedin_url: data.linkedin_url || null,
      status: data.status || 'applied',
      notes: data.notes || null,
    })
    return db().prepare('SELECT * FROM instructors WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('instructor:update', (_e, id: number, data: any) => {
    const fields = Object.keys(data)
      .filter(k => k !== 'id')
      .map(k => `${k} = @${k}`)
      .join(', ')
    db().prepare(`UPDATE instructors SET ${fields}, updated_at = unixepoch() WHERE id = @id`)
      .run({ ...data, id })
    return db().prepare('SELECT * FROM instructors WHERE id = ?').get(id)
  })

  ipcMain.handle('instructor:delete', (_e, id: number) => {
    db().prepare('DELETE FROM demo_sessions WHERE instructor_id = ?').run(id)
    db().prepare('DELETE FROM instructors WHERE id = ?').run(id)
    return { success: true }
  })
}
