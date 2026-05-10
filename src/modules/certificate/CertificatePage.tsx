import { useEffect, useRef, useState } from 'react'
import { Plus, Upload, X, Download, FileDown } from 'lucide-react'
import {
  certificates as certApi, certTemplates as tplApi, learners as learnerApi,
  type Certificate, type CertTemplate, type Learner,
  uploadFile,
} from '@/lib/api'
import { generateCertNumber, formatDate, downloadBlob } from '@/lib/utils'
import Papa from 'papaparse'

export default function CertificatePage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [templates, setTemplates] = useState<CertTemplate[]>([])
  const [learnerList, setLearnerList] = useState<Learner[]>([])
  const [tab, setTab] = useState<'list' | 'generate' | 'templates'>('list')

  // Generate form
  const [selectedTpl, setSelectedTpl] = useState('')
  const [courseName, setCourseName] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<{ learner_id: string; cert_number: string }[]>([{ learner_id: '', cert_number: generateCertNumber() }])

  // Template upload
  const [tplName, setTplName] = useState('')
  const [tplFile, setTplFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const csvRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const [c, t, l] = await Promise.all([certApi.list(), tplApi.list(), learnerApi.list()])
    setCerts(c)
    setTemplates(t)
    setLearnerList(l)
  }

  useEffect(() => { load() }, [])

  const addRow = () => setRows(r => [...r, { learner_id: '', cert_number: generateCertNumber() }])
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: string, val: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const importCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<{ full_name: string }>(file, {
      header: true, skipEmptyLines: true,
      complete: result => {
        const newRows = result.data.map(row => {
          const learner = learnerList.find(l => l.full_name.toLowerCase() === row.full_name?.toLowerCase())
          return { learner_id: learner ? String(learner.id) : '', cert_number: generateCertNumber() }
        })
        setRows(newRows)
      },
    })
    e.target.value = ''
  }

  const generateAll = async (e: React.FormEvent) => {
    e.preventDefault()
    const items = rows.filter(r => r.learner_id)
    await certApi.bulkCreate(items.map(r => ({
      template_id: selectedTpl ? Number(selectedTpl) : undefined,
      learner_id: Number(r.learner_id),
      course_name: courseName,
      issue_date: issueDate,
      cert_number: r.cert_number,
    })))
    setTab('list')
    load()
  }

  const uploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tplFile || !tplName) return
    setUploading(true)
    try {
      const path = `cert-templates/${Date.now()}_${tplFile.name}`
      const url = await uploadFile('templates', path, tplFile)
      await tplApi.create({ name: tplName, docx_url: url })
      setTplName('')
      setTplFile(null)
      load()
    } finally {
      setUploading(false)
    }
  }

  const removeCert = async (id: number) => {
    if (!confirm('Delete this certificate record?')) return
    await certApi.delete(id)
    setCerts(c => c.filter(x => x.id !== id))
  }

  const exportCsv = () => {
    const header = 'Learner,Course,Issue Date,Cert Number\n'
    const rows_ = certs.map(c =>
      `"${c.learners?.full_name ?? ''}","${c.course_name}","${c.issue_date}","${c.cert_number ?? ''}"`
    ).join('\n')
    downloadBlob(new Blob([header + rows_], { type: 'text/csv' }), 'certificates.csv')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Certificates</h1>
          <p className="text-gray-400 text-sm mt-0.5">{certs.length} certificates issued</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            <FileDown size={15} /> Export CSV
          </button>
          <button onClick={() => setTab('generate')} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            <Plus size={16} /> Generate
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg w-fit">
        {(['list', 'generate', 'templates'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-md transition capitalize ${tab === t ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white'}`}>
            {t === 'generate' ? '+ Generate' : t === 'templates' ? 'DOCX Templates' : 'Issued Certs'}
          </button>
        ))}
      </div>

      {/* Issued certs */}
      {tab === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Learner', 'Course', 'Issue Date', 'Cert #', 'Template', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {certs.map(c => (
                <tr key={c.id} className="hover:bg-gray-900/50">
                  <td className="px-3 py-2.5 text-white font-medium">{c.learners?.full_name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-gray-300">{c.course_name}</td>
                  <td className="px-3 py-2.5 text-gray-400">{c.issue_date}</td>
                  <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{c.cert_number}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{c.cert_templates?.name ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => removeCert(c.id)} className="text-gray-600 hover:text-red-400 transition"><X size={14} /></button>
                  </td>
                </tr>
              ))}
              {certs.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No certificates yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate */}
      {tab === 'generate' && (
        <form onSubmit={generateAll} className="max-w-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Course Name *</label>
              <input required value={courseName} onChange={e => setCourseName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Issue Date *</label>
              <input type="date" required value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">DOCX Template (optional)</label>
            <select value={selectedTpl} onChange={e => setSelectedTpl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
              <option value="">No template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Learners</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => csvRef.current?.click()}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <Upload size={12} /> Import CSV
                </button>
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
                <button type="button" onClick={addRow}
                  className="text-xs text-blue-400 hover:text-blue-300">+ Add Row</button>
              </div>
            </div>

            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={row.learner_id} onChange={e => updateRow(i, 'learner_id', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none">
                    <option value="">Select learner…</option>
                    {learnerList.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                  </select>
                  <input value={row.cert_number} onChange={e => updateRow(i, 'cert_number', e.target.value)}
                    placeholder="Cert #"
                    className="w-40 px-2.5 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs font-mono focus:outline-none" />
                  <button type="button" onClick={() => removeRow(i)} className="text-gray-600 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              Generate {rows.filter(r => r.learner_id).length} Certificate(s)
            </button>
          </div>
        </form>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="max-w-xl">
          <form onSubmit={uploadTemplate} className="flex items-end gap-3 mb-6">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Template Name *</label>
              <input required value={tplName} onChange={e => setTplName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">DOCX File *</label>
              <input required type="file" accept=".docx" onChange={e => setTplFile(e.target.files?.[0] ?? null)}
                className="text-xs text-gray-400" />
            </div>
            <button type="submit" disabled={uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm rounded-lg transition">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>

          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <Download size={14} className="text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{t.name}</p>
                  <a href={t.docx_url} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-blue-400 truncate block">
                    {t.docx_url}
                  </a>
                </div>
                <button onClick={async () => { await tplApi.delete(t.id); load() }} className="text-gray-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-gray-500 py-4">No templates uploaded yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
