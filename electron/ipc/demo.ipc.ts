import { ipcMain, BrowserWindow } from 'electron'
import { getDb } from '../services/db.service'

export function registerDemoIpc(win: BrowserWindow | null) {
  const db = () => getDb()

  ipcMain.handle('demo:list', () => {
    return db().prepare(`
      SELECT d.*, i.full_name as instructor_name, i.email as instructor_email
      FROM demo_sessions d
      LEFT JOIN instructors i ON d.instructor_id = i.id
      ORDER BY d.scheduled_at ASC
    `).all()
  })

  ipcMain.handle('demo:get', (_e, id: number) => {
    return db().prepare(`
      SELECT d.*, i.full_name as instructor_name
      FROM demo_sessions d
      LEFT JOIN instructors i ON d.instructor_id = i.id
      WHERE d.id = ?
    `).get(id)
  })

  ipcMain.handle('demo:create', (_e, data: any) => {
    const stmt = db().prepare(`
      INSERT INTO demo_sessions (instructor_id, scheduled_at, duration_mins, location, topic, status)
      VALUES (@instructor_id, @scheduled_at, @duration_mins, @location, @topic, @status)
    `)
    const result = stmt.run({
      instructor_id: data.instructor_id,
      scheduled_at: data.scheduled_at,
      duration_mins: data.duration_mins || 60,
      location: data.location || null,
      topic: data.topic || null,
      status: 'scheduled',
    })
    // Update instructor status
    db().prepare(`UPDATE instructors SET status = 'demo_scheduled', updated_at = unixepoch() WHERE id = ?`)
      .run(data.instructor_id)

    return db().prepare(`
      SELECT d.*, i.full_name as instructor_name
      FROM demo_sessions d LEFT JOIN instructors i ON d.instructor_id = i.id
      WHERE d.id = ?
    `).get(result.lastInsertRowid)
  })

  ipcMain.handle('demo:update', (_e, id: number, data: any) => {
    const fields = Object.keys(data)
      .filter(k => k !== 'id')
      .map(k => `${k} = @${k}`)
      .join(', ')
    db().prepare(`UPDATE demo_sessions SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db().prepare('SELECT * FROM demo_sessions WHERE id = ?').get(id)
  })

  ipcMain.handle('demo:delete', (_e, id: number) => {
    db().prepare('DELETE FROM demo_sessions WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('demo:submitFeedback', (_e, id: number, feedback: any) => {
    db().prepare(`
      UPDATE demo_sessions SET status = 'done', feedback = @feedback, score = @score WHERE id = @id
    `).run({ id, feedback: feedback.feedback, score: feedback.score })

    // Get demo to find instructor
    const demo = db().prepare('SELECT * FROM demo_sessions WHERE id = ?').get(id) as any
    if (demo) {
      db().prepare(`
        UPDATE instructors SET status = 'demo_done', rating = @rating, updated_at = unixepoch()
        WHERE id = @id
      `).run({ id: demo.instructor_id, rating: feedback.score / 2 }) // convert 10-pt to 5-pt
    }
    return { success: true }
  })

  ipcMain.handle('demo:getUpcoming', () => {
    const now = Math.floor(Date.now() / 1000)
    const in7days = now + 7 * 24 * 60 * 60
    return db().prepare(`
      SELECT d.*, i.full_name as instructor_name
      FROM demo_sessions d
      LEFT JOIN instructors i ON d.instructor_id = i.id
      WHERE d.status = 'scheduled' AND d.scheduled_at BETWEEN ? AND ?
      ORDER BY d.scheduled_at ASC
    `).all(now, in7days)
  })
}
