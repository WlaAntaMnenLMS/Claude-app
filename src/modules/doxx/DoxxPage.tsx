import { useEffect, useState } from 'react'
import { Plus, X, Package, CheckCircle, Clock, Truck } from 'lucide-react'
import { doxxOrders as api, type DoxxOrder } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type Status = DoxxOrder['status']

const blank = {
  order_type: 'certificate',
  document_ids: '',
  quantity: 1,
  recipient: '',
  address: '',
  status: 'pending' as Status,
  notes: '',
}

const statusIcon = (s: Status) => ({
  pending:   <Clock size={14} className="text-yellow-400" />,
  submitted: <Package size={14} className="text-blue-400" />,
  delivered: <CheckCircle size={14} className="text-green-400" />,
}[s])

const statusColor = (s: Status) => ({
  pending:   'bg-yellow-900/30 text-yellow-300 border-yellow-800',
  submitted: 'bg-blue-900/30 text-blue-300 border-blue-800',
  delivered: 'bg-green-900/30 text-green-300 border-green-800',
}[s])

export default function DoxxPage() {
  const [data, setData] = useState<DoxxOrder[]>([])
  const [form, setForm] = useState({ ...blank })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DoxxOrder | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.list().then(d => { setData(d); setLoading(false) })
  useEffect(() => { load() }, [])

  const openNew = () => { setForm({ ...blank }); setEditing(null); setShowForm(true) }
  const openEdit = (o: DoxxOrder) => {
    setForm({
      order_type: o.order_type,
      document_ids: o.document_ids,
      quantity: o.quantity,
      recipient: o.recipient ?? '',
      address: o.address ?? '',
      status: o.status,
      notes: o.notes ?? '',
    })
    setEditing(o)
    setShowForm(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await api.update(editing.id, form)
    } else {
      await api.create(form)
    }
    setShowForm(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this order?')) return
    await api.delete(id)
    setData(d => d.filter(o => o.id !== id))
  }

  const updateStatus = async (id: number, status: Status) => {
    await api.update(id, { status })
    setData(d => d.map(o => o.id === id ? { ...o, status } : o))
  }

  const pending = data.filter(o => o.status === 'pending').length
  const submitted = data.filter(o => o.status === 'submitted').length
  const delivered = data.filter(o => o.status === 'delivered').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Doxx Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{data.length} orders total</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Submitted', value: submitted, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Delivered', value: delivered, icon: Truck, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-2`}>
              <s.icon size={15} className={s.color} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No orders yet. <button onClick={openNew} className="text-blue-400 hover:underline">Create one</button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(o => (
            <div
              key={o.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition cursor-pointer"
              onClick={() => openEdit(o)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{statusIcon(o.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white capitalize">{o.order_type} Order #{o.id}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(o.status)}`}>{o.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">Qty: {o.quantity} · Recipient: {o.recipient || '—'}</p>
                  {o.address && <p className="text-xs text-gray-600 mt-0.5 truncate">{o.address}</p>}
                  <p className="text-xs text-gray-600 mt-1">{formatDate(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={o.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateStatus(o.id, e.target.value as Status)}
                    className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-1.5 py-1 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <button
                    onClick={e => { e.stopPropagation(); remove(o.id) }}
                    className="text-gray-600 hover:text-red-400 transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">{editing ? 'Edit Order' : 'New Doxx Order'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Order Type</label>
                <select value={form.order_type} onChange={e => setForm(f => ({ ...f, order_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                  <option value="certificate">Certificate</option>
                  <option value="transcript">Transcript</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Document IDs (comma-separated)</label>
                <input value={form.document_ids} onChange={e => setForm(f => ({ ...f, document_ids: e.target.value }))}
                  placeholder="e.g. 1,2,3"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quantity *</label>
                <input type="number" required min={1} value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Recipient</label>
                <input value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Delivery Address</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                  {editing ? 'Save' : 'Create Order'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg transition hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
