import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'

export function registerDoxxIpc() {
  const db = () => getDb()

  ipcMain.handle('doxx:list', () =>
    db().prepare('SELECT * FROM doxx_orders ORDER BY created_at DESC').all()
  )

  ipcMain.handle('doxx:create', (_e, data: any) => {
    const r = db().prepare(`
      INSERT INTO doxx_orders (order_type, document_ids, quantity, recipient, address, notes, status)
      VALUES (@order_type, @document_ids, @quantity, @recipient, @address, @notes, 'pending')
    `).run({
      order_type: data.order_type,
      document_ids: JSON.stringify(data.document_ids),
      quantity: data.quantity,
      recipient: data.recipient || null,
      address: data.address || null,
      notes: data.notes || null,
    })
    return db().prepare('SELECT * FROM doxx_orders WHERE id = ?').get(r.lastInsertRowid)
  })

  ipcMain.handle('doxx:updateStatus', (_e, id: number, status: string) => {
    db().prepare('UPDATE doxx_orders SET status = ? WHERE id = ?').run(status, id)
    return db().prepare('SELECT * FROM doxx_orders WHERE id = ?').get(id)
  })

  ipcMain.handle('doxx:delete', (_e, id: number) => {
    db().prepare('DELETE FROM doxx_orders WHERE id = ?').run(id)
    return { success: true }
  })
}
