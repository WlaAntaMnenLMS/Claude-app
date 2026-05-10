import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────

export interface Instructor {
  id: number
  full_name: string
  email?: string
  phone?: string
  specialization?: string
  cv_url?: string
  linkedin_url?: string
  status: 'applied' | 'demo_scheduled' | 'demo_done' | 'hired' | 'rejected'
  rating?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface DemoSession {
  id: number
  instructor_id: number
  scheduled_at: string
  duration_mins: number
  location?: string
  topic?: string
  status: 'scheduled' | 'done' | 'cancelled'
  feedback?: string
  score?: number
  created_at: string
  instructors?: { full_name: string }
}

export interface Client {
  id: number
  name: string
  contact?: string
  email?: string
  phone?: string
  industry?: string
  notes?: string
  created_at: string
}

export interface ProposalTemplate {
  id: number
  name: string
  content: string
  variables?: string
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: number
  client_id?: number
  template_id?: number
  title: string
  program_name?: string
  content: string
  variables_data?: string
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  clients?: { name: string }
  proposal_templates?: { name: string }
}

export interface Learner {
  id: number
  full_name: string
  national_id?: string
  email?: string
  phone?: string
  organization?: string
  created_at: string
}

export interface CertTemplate {
  id: number
  name: string
  docx_url: string
  variables?: string
  created_at: string
}

export interface Certificate {
  id: number
  template_id?: number
  learner_id?: number
  course_name: string
  issue_date: string
  cert_number?: string
  extra_data?: string
  doxx_order_id?: number
  created_at: string
  learners?: { full_name: string }
  cert_templates?: { name: string }
}

export interface Course {
  id: number
  name: string
  code?: string
  hours?: number
  category?: string
  description?: string
  created_at: string
}

export interface TranscriptTemplate {
  id: number
  name: string
  docx_url: string
  variables?: string
  created_at: string
}

export interface Transcript {
  id: number
  template_id?: number
  learner_id?: number
  courses_data: string
  doxx_order_id?: number
  created_at: string
  learners?: { full_name: string }
  transcript_templates?: { name: string }
}

export interface DoxxOrder {
  id: number
  order_type: string
  document_ids: string
  quantity: number
  recipient?: string
  address?: string
  status: 'pending' | 'submitted' | 'delivered'
  notes?: string
  created_at: string
}

export interface CommunicationTemplate {
  id: number
  name: string
  channel: 'whatsapp' | 'email'
  subject?: string
  body: string
  variables?: string
  category?: string
  created_at: string
  updated_at: string
}

export interface AgentMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  intent?: string
  module?: string
  created_at: string
}

// ── Instructors ───────────────────────────────────────────────

export const instructors = {
  list: async () => {
    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Instructor[]
  },

  create: async (payload: Omit<Instructor, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('instructors')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as Instructor
  },

  update: async (id: number, payload: Partial<Instructor>) => {
    const { data, error } = await supabase
      .from('instructors')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Instructor
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('instructors').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Demo Sessions ─────────────────────────────────────────────

export const demos = {
  list: async () => {
    const { data, error } = await supabase
      .from('demo_sessions')
      .select('*, instructors(full_name)')
      .order('scheduled_at', { ascending: true })
    if (error) throw error
    return data as DemoSession[]
  },

  create: async (payload: Omit<DemoSession, 'id' | 'created_at' | 'instructors'>) => {
    const { data, error } = await supabase
      .from('demo_sessions')
      .insert(payload)
      .select('*, instructors(full_name)')
      .single()
    if (error) throw error
    return data as DemoSession
  },

  update: async (id: number, payload: Partial<DemoSession>) => {
    const { data, error } = await supabase
      .from('demo_sessions')
      .update(payload)
      .eq('id', id)
      .select('*, instructors(full_name)')
      .single()
    if (error) throw error
    return data as DemoSession
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('demo_sessions').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Clients ───────────────────────────────────────────────────

export const clients = {
  list: async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    if (error) throw error
    return data as Client[]
  },

  create: async (payload: Omit<Client, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as Client
  },

  update: async (id: number, payload: Partial<Client>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Client
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Proposal Templates ────────────────────────────────────────

export const proposalTemplates = {
  list: async () => {
    const { data, error } = await supabase
      .from('proposal_templates')
      .select('*')
      .order('name')
    if (error) throw error
    return data as ProposalTemplate[]
  },

  create: async (payload: Omit<ProposalTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('proposal_templates')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as ProposalTemplate
  },

  update: async (id: number, payload: Partial<ProposalTemplate>) => {
    const { data, error } = await supabase
      .from('proposal_templates')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ProposalTemplate
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('proposal_templates').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Proposals ─────────────────────────────────────────────────

export const proposals = {
  list: async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, clients(name), proposal_templates(name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Proposal[]
  },

  create: async (payload: Omit<Proposal, 'id' | 'created_at' | 'updated_at' | 'clients' | 'proposal_templates'>) => {
    const { data, error } = await supabase
      .from('proposals')
      .insert(payload)
      .select('*, clients(name), proposal_templates(name)')
      .single()
    if (error) throw error
    return data as Proposal
  },

  update: async (id: number, payload: Partial<Proposal>) => {
    const { data, error } = await supabase
      .from('proposals')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clients(name), proposal_templates(name)')
      .single()
    if (error) throw error
    return data as Proposal
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('proposals').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Learners ──────────────────────────────────────────────────

export const learners = {
  list: async () => {
    const { data, error } = await supabase
      .from('learners')
      .select('*')
      .order('full_name')
    if (error) throw error
    return data as Learner[]
  },

  create: async (payload: Omit<Learner, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('learners')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as Learner
  },

  bulkCreate: async (items: Omit<Learner, 'id' | 'created_at'>[]) => {
    const { data, error } = await supabase
      .from('learners')
      .insert(items)
      .select()
    if (error) throw error
    return data as Learner[]
  },

  update: async (id: number, payload: Partial<Learner>) => {
    const { data, error } = await supabase
      .from('learners')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Learner
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('learners').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Cert Templates ────────────────────────────────────────────

export const certTemplates = {
  list: async () => {
    const { data, error } = await supabase
      .from('cert_templates')
      .select('*')
      .order('name')
    if (error) throw error
    return data as CertTemplate[]
  },

  create: async (payload: Omit<CertTemplate, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('cert_templates')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as CertTemplate
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('cert_templates').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Certificates ──────────────────────────────────────────────

export const certificates = {
  list: async () => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, learners(full_name), cert_templates(name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Certificate[]
  },

  create: async (payload: Omit<Certificate, 'id' | 'created_at' | 'learners' | 'cert_templates'>) => {
    const { data, error } = await supabase
      .from('certificates')
      .insert(payload)
      .select('*, learners(full_name), cert_templates(name)')
      .single()
    if (error) throw error
    return data as Certificate
  },

  bulkCreate: async (items: Omit<Certificate, 'id' | 'created_at' | 'learners' | 'cert_templates'>[]) => {
    const { data, error } = await supabase
      .from('certificates')
      .insert(items)
      .select('*, learners(full_name), cert_templates(name)')
    if (error) throw error
    return data as Certificate[]
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('certificates').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Transcript Templates ──────────────────────────────────────

export const transcriptTemplates = {
  list: async () => {
    const { data, error } = await supabase
      .from('transcript_templates')
      .select('*')
      .order('name')
    if (error) throw error
    return data as TranscriptTemplate[]
  },

  create: async (payload: Omit<TranscriptTemplate, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('transcript_templates')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as TranscriptTemplate
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('transcript_templates').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Transcripts ───────────────────────────────────────────────

export const transcripts = {
  list: async () => {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*, learners(full_name), transcript_templates(name)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Transcript[]
  },

  create: async (payload: Omit<Transcript, 'id' | 'created_at' | 'learners' | 'transcript_templates'>) => {
    const { data, error } = await supabase
      .from('transcripts')
      .insert(payload)
      .select('*, learners(full_name), transcript_templates(name)')
      .single()
    if (error) throw error
    return data as Transcript
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('transcripts').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Doxx Orders ───────────────────────────────────────────────

export const doxxOrders = {
  list: async () => {
    const { data, error } = await supabase
      .from('doxx_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as DoxxOrder[]
  },

  create: async (payload: Omit<DoxxOrder, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('doxx_orders')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as DoxxOrder
  },

  update: async (id: number, payload: Partial<DoxxOrder>) => {
    const { data, error } = await supabase
      .from('doxx_orders')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DoxxOrder
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('doxx_orders').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Communication Templates ───────────────────────────────────

export const commTemplates = {
  list: async () => {
    const { data, error } = await supabase
      .from('communication_templates')
      .select('*')
      .order('category')
    if (error) throw error
    return data as CommunicationTemplate[]
  },

  create: async (payload: Omit<CommunicationTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('communication_templates')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as CommunicationTemplate
  },

  update: async (id: number, payload: Partial<CommunicationTemplate>) => {
    const { data, error } = await supabase
      .from('communication_templates')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CommunicationTemplate
  },

  delete: async (id: number) => {
    const { error } = await supabase.from('communication_templates').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Agent History ─────────────────────────────────────────────

export const agentHistory = {
  list: async (limit = 50) => {
    const { data, error } = await supabase
      .from('agent_history')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) throw error
    return data as AgentMessage[]
  },

  add: async (payload: Omit<AgentMessage, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('agent_history')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as AgentMessage
  },

  clear: async () => {
    const { error } = await supabase
      .from('agent_history')
      .delete()
      .neq('id', 0)
    if (error) throw error
  },
}

// ── Global Search ─────────────────────────────────────────────

export interface SearchResult {
  type: string
  id: number
  label: string
  sublabel?: string
  route: string
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  const [instrData, clientData, learnerData, proposalData] = await Promise.all([
    supabase.from('instructors').select('id,full_name,specialization').ilike('full_name', `%${q}%`).limit(5),
    supabase.from('clients').select('id,name,industry').ilike('name', `%${q}%`).limit(5),
    supabase.from('learners').select('id,full_name,organization').ilike('full_name', `%${q}%`).limit(5),
    supabase.from('proposals').select('id,title,program_name').ilike('title', `%${q}%`).limit(5),
  ])

  instrData.data?.forEach(r =>
    results.push({ type: 'Instructor', id: r.id, label: r.full_name, sublabel: r.specialization, route: '/instructors' })
  )
  clientData.data?.forEach(r =>
    results.push({ type: 'Client', id: r.id, label: r.name, sublabel: r.industry, route: '/proposals' })
  )
  learnerData.data?.forEach(r =>
    results.push({ type: 'Learner', id: r.id, label: r.full_name, sublabel: r.organization, route: '/certificates' })
  )
  proposalData.data?.forEach(r =>
    results.push({ type: 'Proposal', id: r.id, label: r.title, sublabel: r.program_name, route: '/proposals' })
  )

  return results
}

// ── Dashboard Stats ───────────────────────────────────────────

export async function getDashboardStats() {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())

  const [instr, demos, proposals_, certs] = await Promise.all([
    supabase.from('instructors').select('id, status'),
    supabase.from('demo_sessions').select('id, scheduled_at, status').gte('scheduled_at', weekStart.toISOString()),
    supabase.from('proposals').select('id, status'),
    supabase.from('certificates').select('id').gte('created_at', weekStart.toISOString()),
  ])

  return {
    totalInstructors: instr.data?.length ?? 0,
    activeInstructors: instr.data?.filter(i => !['rejected'].includes(i.status)).length ?? 0,
    demosThisWeek: demos.data?.length ?? 0,
    upcomingDemos: demos.data?.filter(d => d.status === 'scheduled').length ?? 0,
    totalProposals: proposals_.data?.length ?? 0,
    draftProposals: proposals_.data?.filter(p => p.status === 'draft').length ?? 0,
    certsThisWeek: certs.data?.length ?? 0,
  }
}

// ── Storage Helpers ───────────────────────────────────────────

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function fetchFileBlob(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch template file')
  return res.arrayBuffer()
}
