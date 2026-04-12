import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'

export function registerAuthIpc() {
  const db = getDb()

  // List all users
  ipcMain.handle('auth:listUsers', () => {
    return db.prepare(`SELECT id, name, email, role, avatar, is_active, created_at FROM users ORDER BY role, name`).all()
  })

  // Login with email + PIN
  ipcMain.handle('auth:login', (_e, email: string, pin: string) => {
    const user = db.prepare(`
      SELECT id, name, email, role, avatar, is_active FROM users
      WHERE email = ? AND pin_hash = ? AND is_active = 1
    `).get(email, pin) as any
    if (!user) return { success: false, error: 'Invalid email or PIN' }
    return { success: true, user }
  })

  // Create user (manager only action — enforced in UI)
  ipcMain.handle('auth:createUser', (_e, data: { name: string; email: string; pin: string; role: string }) => {
    try {
      const result = db.prepare(`
        INSERT INTO users (name, email, pin_hash, role) VALUES (?, ?, ?, ?)
      `).run(data.name, data.email, data.pin, data.role)
      return { success: true, id: result.lastInsertRowid }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Update user
  ipcMain.handle('auth:updateUser', (_e, id: number, data: { name?: string; email?: string; pin?: string; role?: string; is_active?: number }) => {
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined)      { fields.push('name = ?');      values.push(data.name) }
    if (data.email !== undefined)     { fields.push('email = ?');     values.push(data.email) }
    if (data.pin !== undefined)       { fields.push('pin_hash = ?');  values.push(data.pin) }
    if (data.role !== undefined)      { fields.push('role = ?');      values.push(data.role) }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active) }
    if (!fields.length) return { success: false, error: 'No fields to update' }
    values.push(id)
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return { success: true }
  })

  // Delete user
  ipcMain.handle('auth:deleteUser', (_e, id: number) => {
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id)
    return { success: true }
  })
}
