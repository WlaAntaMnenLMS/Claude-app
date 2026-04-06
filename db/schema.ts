import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── INSTRUCTORS ──────────────────────────────────────────────────────────────
export const instructors = sqliteTable('instructors', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  full_name:      text('full_name').notNull(),
  email:          text('email').unique(),
  phone:          text('phone'),
  specialization: text('specialization'),   // e.g. "Soft Skills, Leadership"
  cv_path:        text('cv_path'),
  linkedin_url:   text('linkedin_url'),
  status:         text('status').notNull().default('applied'),
  // applied | demo_scheduled | demo_done | hired | rejected
  rating:         real('rating'),            // 1.0–5.0, post-demo
  notes:          text('notes'),
  created_at:     integer('created_at').default(sql`(unixepoch())`),
  updated_at:     integer('updated_at').default(sql`(unixepoch())`),
})

// ─── DEMO SESSIONS ────────────────────────────────────────────────────────────
export const demoSessions = sqliteTable('demo_sessions', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  instructor_id: integer('instructor_id').references(() => instructors.id),
  scheduled_at:  integer('scheduled_at').notNull(), // Unix timestamp
  duration_mins: integer('duration_mins').default(60),
  location:      text('location'),
  topic:         text('topic'),
  status:        text('status').default('scheduled'),
  // scheduled | done | cancelled
  feedback:      text('feedback'),
  score:         integer('score'),           // 1–10
  created_at:    integer('created_at').default(sql`(unixepoch())`),
})

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
export const clients = sqliteTable('clients', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  contact:    text('contact'),
  email:      text('email'),
  phone:      text('phone'),
  industry:   text('industry'),
  notes:      text('notes'),
  created_at: integer('created_at').default(sql`(unixepoch())`),
})

// ─── PROPOSAL TEMPLATES ───────────────────────────────────────────────────────
export const proposalTemplates = sqliteTable('proposal_templates', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  content:    text('content').notNull(),   // Markdown with {{variable}} placeholders
  variables:  text('variables'),            // JSON array: ["client_name","program_name"]
  created_at: integer('created_at').default(sql`(unixepoch())`),
  updated_at: integer('updated_at').default(sql`(unixepoch())`),
})

// ─── PROPOSALS ────────────────────────────────────────────────────────────────
export const proposals = sqliteTable('proposals', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  client_id:    integer('client_id').references(() => clients.id),
  template_id:  integer('template_id').references(() => proposalTemplates.id),
  title:        text('title').notNull(),
  program_name: text('program_name'),
  content:      text('content').notNull(),  // Final rendered Markdown
  variables_data: text('variables_data'),   // JSON: filled variable values
  status:       text('status').default('draft'),
  // draft | sent | approved | rejected
  output_path:  text('output_path'),
  created_at:   integer('created_at').default(sql`(unixepoch())`),
  updated_at:   integer('updated_at').default(sql`(unixepoch())`),
})

// ─── LEARNERS ─────────────────────────────────────────────────────────────────
export const learners = sqliteTable('learners', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  full_name:    text('full_name').notNull(),
  national_id:  text('national_id'),
  email:        text('email'),
  phone:        text('phone'),
  organization: text('organization'),
  created_at:   integer('created_at').default(sql`(unixepoch())`),
})

// ─── CERTIFICATE TEMPLATES ────────────────────────────────────────────────────
export const certTemplates = sqliteTable('cert_templates', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  docx_path:  text('docx_path').notNull(),
  variables:  text('variables'),   // JSON array of detected {{placeholders}}
  created_at: integer('created_at').default(sql`(unixepoch())`),
})

// ─── CERTIFICATES ─────────────────────────────────────────────────────────────
export const certificates = sqliteTable('certificates', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  template_id:   integer('template_id').references(() => certTemplates.id),
  learner_id:    integer('learner_id').references(() => learners.id),
  course_name:   text('course_name').notNull(),
  issue_date:    text('issue_date').notNull(),
  cert_number:   text('cert_number'),
  extra_data:    text('extra_data'),    // JSON for any extra template variables
  output_path:   text('output_path'),
  doxx_order_id: integer('doxx_order_id'),
  created_at:    integer('created_at').default(sql`(unixepoch())`),
})

// ─── COURSES ──────────────────────────────────────────────────────────────────
export const courses = sqliteTable('courses', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),
  code:        text('code'),
  hours:       integer('hours'),
  category:    text('category'),
  description: text('description'),
  created_at:  integer('created_at').default(sql`(unixepoch())`),
})

// ─── TRANSCRIPT TEMPLATES ─────────────────────────────────────────────────────
export const transcriptTemplates = sqliteTable('transcript_templates', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  docx_path:  text('docx_path').notNull(),
  variables:  text('variables'),   // JSON array
  created_at: integer('created_at').default(sql`(unixepoch())`),
})

// ─── TRANSCRIPTS ──────────────────────────────────────────────────────────────
export const transcripts = sqliteTable('transcripts', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  template_id:   integer('template_id').references(() => transcriptTemplates.id),
  learner_id:    integer('learner_id').references(() => learners.id),
  courses_data:  text('courses_data').notNull(),
  // JSON: [{course_name, course_code, grade, hours, completion_date}]
  output_path:   text('output_path'),
  doxx_order_id: integer('doxx_order_id'),
  created_at:    integer('created_at').default(sql`(unixepoch())`),
})

// ─── DOXX ORDERS ──────────────────────────────────────────────────────────────
export const doxxOrders = sqliteTable('doxx_orders', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  order_type:   text('order_type').notNull(),    // "certificate" | "transcript" | "mixed"
  document_ids: text('document_ids').notNull(),  // JSON array of cert/transcript IDs
  quantity:     integer('quantity').notNull(),
  recipient:    text('recipient'),
  address:      text('address'),
  status:       text('status').default('pending'),
  // pending | submitted | processing | delivered
  notes:        text('notes'),
  created_at:   integer('created_at').default(sql`(unixepoch())`),
})

// ─── AGENT HISTORY ────────────────────────────────────────────────────────────
export const agentHistory = sqliteTable('agent_history', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  role:       text('role').notNull(),    // "user" | "assistant"
  content:    text('content').notNull(),
  intent:     text('intent'),
  module:     text('module'),
  created_at: integer('created_at').default(sql`(unixepoch())`),
})
