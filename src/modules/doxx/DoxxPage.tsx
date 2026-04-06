import { useEffect, useState } from 'react'
import { Package, Plus, Copy, CheckCircle, Clock, Truck } from 'lucide-react'
import { api } from '@/lib/ipc'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/shared/StatusBadge'

export default function DoxxPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [transcripts, setTranscripts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const [o, c, t] = await Promise.all([
      api.doxx.list(), api.certificate.list(), api.transcript.list()
    ])
    setOrders(o); setCertificates(c); setTranscripts(t)
  }
  useEffect(() => { load() }, [])

  const STATUS_FLOW = ['pending', 'submitted', 'processing', 'delivered'] as const
  const STATUS_ICONS: Record<string, any> = {
    pending: Clock, submitted: Package, processing: Truck, delivered: CheckCircle,
  }

  async function advance(order: any) {
    const idx = STATUS_FLOW.indexOf(order.status)
    if (idx < STATUS_FLOW.length - 1) {
      await api.doxx.updateStatus(order.id, STATUS_FLOW[idx + 1])
      load()
    }
  }

  function copyOrderDetails(order: any) {
    const ids = JSON.parse(order.document_ids || '[]')
    const text = [
      `Doxx Order #${order.id}`,
      `Type: ${order.order_type}`,
      `Documents: ${ids.length} items`,
      `Quantity: ${order.quantity}`,
      `Recipient: ${order.recipient || 'N/A'}`,
      `Address: ${order.address || 'N/A'}`,
      `Notes: ${order.notes || 'N/A'}`,
      `Status: ${order.status}`,
      `Date: ${formatDate(order.created_at)}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
      .then(() => alert('Order details copied to clipboard!'))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          <h1 className="text-xl font-bold">Doxx Orders</h1>
          <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {STATUS_FLOW.map(status => {
          const Icon = STATUS_ICONS[status]
          const count = orders.filter(o => o.status === status).length
          return (
            <div key={status} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No Doxx orders yet. Create one to order physical copies.</p>
          </div>
        ) : orders.map(order => {
          const docIds = JSON.parse(order.document_ids || '[]')
          const Icon = STATUS_ICONS[order.status]
          return (
            <div key={order.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium capitalize">Order #{order.id} — {order.order_type}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <p>📄 {docIds.length} documents</p>
                    <p>🔢 Qty: {order.quantity}</p>
                    {order.recipient && <p>👤 {order.recipient}</p>}
                    {order.address && <p className="truncate">📍 {order.address}</p>}
                  </div>
                  {order.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{order.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {order.status !== 'delivered' && (
                    <button onClick={() => advance(order)}
                      className="px-3 py-1.5 text-xs bg-primary/20 text-primary hover:bg-primary/30 rounded-lg">
                      Mark {STATUS_FLOW[STATUS_FLOW.indexOf(order.status as any) + 1]}
                    </button>
                  )}
                  <button onClick={() => copyOrderDetails(order)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary hover:bg-accent rounded-lg">
                    <Copy className="w-3 h-3" /> Copy Details
                  </button>
                  <button onClick={async () => { await api.doxx.delete(order.id); load() }}
                    className="text-xs text-destructive hover:underline text-center">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <DoxxOrderForm
          certificates={certificates}
          transcripts={transcripts}
          onSave={async (data: any) => {
            await api.doxx.create(data)
            setShowForm(false)
            load()
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ─── Order Form ───────────────────────────────────────────────────────────────
function DoxxOrderForm({ certificates, transcripts, onSave, onClose }: any) {
  const [orderType, setOrderType] = useState<'certificate' | 'transcript' | 'mixed'>('certificate')
  const [selectedCerts, setSelectedCerts] = useState<Set<number>>(new Set())
  const [selectedTrans, setSelectedTrans] = useState<Set<number>>(new Set())
  const [form, setForm] = useState({ quantity: 1, recipient: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)

  function toggleId(set: Set<number>, id: number, setter: any) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    setter(next)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const docIds = [
      ...[...selectedCerts].map(id => ({ type: 'cert', id })),
      ...[...selectedTrans].map(id => ({ type: 'transcript', id })),
    ]
    if (docIds.length === 0) { alert('Select at least one document'); return }
    setSaving(true)
    try {
      await onSave({
        order_type: orderType,
        document_ids: docIds,
        quantity: form.quantity,
        recipient: form.recipient || null,
        address: form.address || null,
        notes: form.notes || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">New Doxx Order</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Order type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Order Type</label>
            <div className="flex gap-2">
              {(['certificate', 'transcript', 'mixed'] as const).map(t => (
                <button type="button" key={t} onClick={() => setOrderType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm capitalize border transition-colors ${
                    orderType === t ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-accent'
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* Select documents */}
          {(orderType === 'certificate' || orderType === 'mixed') && certificates.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Certificates ({selectedCerts.size} selected)
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-secondary rounded-lg p-2">
                {certificates.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded cursor-pointer">
                    <input type="checkbox" checked={selectedCerts.has(c.id)}
                      onChange={() => toggleId(selectedCerts, c.id, setSelectedCerts)}
                      className="w-3.5 h-3.5 accent-primary" />
                    <span className="text-xs">{c.learner_name} — {c.course_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {(orderType === 'transcript' || orderType === 'mixed') && transcripts.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Transcripts ({selectedTrans.size} selected)
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-secondary rounded-lg p-2">
                {transcripts.map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded cursor-pointer">
                    <input type="checkbox" checked={selectedTrans.has(t.id)}
                      onChange={() => toggleId(selectedTrans, t.id, setSelectedTrans)}
                      className="w-3.5 h-3.5 accent-primary" />
                    <span className="text-xs">{t.learner_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity *</label>
              <input type="number" min={1} value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Recipient</label>
              <input value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}
                placeholder="Name or company"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Delivery Address</label>
              <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Full address for physical delivery" rows={2}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any special instructions"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
