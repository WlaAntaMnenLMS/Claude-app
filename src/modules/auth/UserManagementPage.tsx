import { useState, useEffect } from 'react'
import { UserPlus, Pencil, Trash2, ShieldCheck, User, KeyRound } from 'lucide-react'

interface AppUser { id: number; name: string; email: string; role: string; is_active: number }

export default function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [form, setForm] = useState({ name: '', email: '', pin: '', role: 'specialist' })
  const [error, setError] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const list = await (window as any).api.auth.listUsers()
    setUsers(list)
  }

  function openCreate() { setEditing(null); setForm({ name: '', email: '', pin: '', role: 'specialist' }); setShowForm(true); setError('') }
  function openEdit(u: AppUser) { setEditing(u); setForm({ name: u.name, email: u.email, pin: '', role: u.role }); setShowForm(true); setError('') }

  async function handleSave() {
    if (!form.name || !form.email) { setError('Name and email are required'); return }
    if (!editing && !form.pin) { setError('PIN is required for new users'); return }
    setError('')
    if (editing) {
      const payload: any = { name: form.name, email: form.email, role: form.role }
      if (form.pin) payload.pin = form.pin
      await (window as any).api.auth.updateUser(editing.id, payload)
    } else {
      const res = await (window as any).api.auth.createUser(form)
      if (!res.success) { setError(res.error); return }
    }
    setShowForm(false)
    loadUsers()
  }

  async function handleToggleActive(u: AppUser) {
    await (window as any).api.auth.updateUser(u.id, { is_active: u.is_active ? 0 : 1 })
    loadUsers()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user?')) return
    await (window as any).api.auth.deleteUser(id)
    loadUsers()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage team access and roles</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* User list */}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {u.role === 'manager' ? <ShieldCheck className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'manager' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {u.role === 'manager' ? 'Manager' : 'Specialist'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
              {u.is_active ? 'Active' : 'Inactive'}
            </span>
            <div className="flex gap-1">
              <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleToggleActive(u)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground" title={u.is_active ? 'Deactivate' : 'Activate'}>
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-lg">{editing ? 'Edit User' : 'Add New User'}</h2>
            <div className="space-y-3">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Ahmed Younes' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'ahmed@trainnovation.com' },
                { label: editing ? 'New PIN (leave blank to keep)' : 'PIN', key: 'pin', type: 'password', placeholder: '****' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-1">{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="specialist">Specialist</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
