import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), 'data')
  const dbDir = path.join(userDataPath, 'db')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  const dbPath = path.join(dbDir, 'ld-assistant.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS instructors (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name      TEXT NOT NULL,
      email          TEXT UNIQUE,
      phone          TEXT,
      specialization TEXT,
      cv_path        TEXT,
      linkedin_url   TEXT,
      status         TEXT NOT NULL DEFAULT 'applied',
      rating         REAL,
      notes          TEXT,
      created_at     INTEGER DEFAULT (unixepoch()),
      updated_at     INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS demo_sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      instructor_id  INTEGER REFERENCES instructors(id),
      scheduled_at   INTEGER NOT NULL,
      duration_mins  INTEGER DEFAULT 60,
      location       TEXT,
      topic          TEXT,
      status         TEXT DEFAULT 'scheduled',
      feedback       TEXT,
      score          INTEGER,
      created_at     INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS clients (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      contact    TEXT,
      email      TEXT,
      phone      TEXT,
      industry   TEXT,
      notes      TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS proposal_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL,
      variables  TEXT,
      is_premium INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id      INTEGER REFERENCES clients(id),
      template_id    INTEGER REFERENCES proposal_templates(id),
      title          TEXT NOT NULL,
      program_name   TEXT,
      content        TEXT NOT NULL,
      variables_data TEXT,
      status         TEXT DEFAULT 'draft',
      output_path    TEXT,
      created_at     INTEGER DEFAULT (unixepoch()),
      updated_at     INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS learners (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name    TEXT NOT NULL,
      national_id  TEXT,
      email        TEXT,
      phone        TEXT,
      organization TEXT,
      created_at   INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS cert_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      docx_path  TEXT NOT NULL,
      variables  TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id   INTEGER REFERENCES cert_templates(id),
      learner_id    INTEGER REFERENCES learners(id),
      course_name   TEXT NOT NULL,
      issue_date    TEXT NOT NULL,
      cert_number   TEXT,
      extra_data    TEXT,
      output_path   TEXT,
      doxx_order_id INTEGER,
      created_at    INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS courses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      code        TEXT,
      hours       INTEGER,
      category    TEXT,
      description TEXT,
      created_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS transcript_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      docx_path  TEXT NOT NULL,
      variables  TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id   INTEGER REFERENCES transcript_templates(id),
      learner_id    INTEGER REFERENCES learners(id),
      courses_data  TEXT NOT NULL,
      output_path   TEXT,
      doxx_order_id INTEGER,
      created_at    INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS doxx_orders (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_type   TEXT NOT NULL,
      document_ids TEXT NOT NULL,
      quantity     INTEGER NOT NULL,
      recipient    TEXT,
      address      TEXT,
      status       TEXT DEFAULT 'pending',
      notes        TEXT,
      created_at   INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS agent_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      intent     TEXT,
      module     TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT UNIQUE NOT NULL,
      pin_hash   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'specialist',
      avatar     TEXT,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS communication_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      channel    TEXT NOT NULL DEFAULT 'whatsapp',
      subject    TEXT,
      body       TEXT NOT NULL,
      variables  TEXT,
      category   TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS communications_sent (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES communication_templates(id),
      recipient   TEXT NOT NULL,
      channel     TEXT NOT NULL,
      subject     TEXT,
      message     TEXT NOT NULL,
      sent_at     INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS network_settings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      mode        TEXT NOT NULL DEFAULT 'local',
      server_port INTEGER DEFAULT 4765,
      server_pin  TEXT,
      server_host TEXT,
      updated_at  INTEGER DEFAULT (unixepoch())
    );
  `)

  // Ensure core accounts always exist (INSERT OR IGNORE = never overwrite an existing account)
  const ensureUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, pin_hash, role) VALUES (?, ?, ?, ?)
  `)
  ensureUser.run('Ahmed Younes',   'ahmed_younes@tig-uk.co.uk',   '1887366', 'manager')
  ensureUser.run('Tasneem Khaled', 'tasneem_khaled@tig-uk.co.uk', '12345',   'specialist')

  // Seed default network settings if missing
  const netCount = (db.prepare('SELECT COUNT(*) as c FROM network_settings').get() as any).c
  if (netCount === 0) {
    db.prepare(`INSERT INTO network_settings (mode, server_port) VALUES ('local', 4765)`).run()
  }

  // Migration: add is_premium column if missing (safe on existing DBs)
  try {
    db.prepare('ALTER TABLE proposal_templates ADD COLUMN is_premium INTEGER DEFAULT 0').run()
  } catch { /* column already exists */ }

  // Seed Naguib Selim premium proposal template
  const ptCount = (db.prepare('SELECT COUNT(*) as c FROM proposal_templates').get() as any).c
  if (ptCount === 0) {
    const naguibContent = `# {{program_name}} Training Proposal

**Prepared for:** {{client_name}}
**Industry:** {{client_industry}}
**Date:** {{proposal_date}}
**Prepared by:** {{sender_name}} — {{sender_title}}
**Vendor:** {{vendor_name}}

---

## Executive Summary

Dear {{client_contact_name}},

Thank you for the opportunity to present this proposal for {{client_name}}. We at {{vendor_name}} are pleased to offer a customized {{program_name}} program tailored to your organization's specific needs and goals.

{{executive_summary}}

---

## Program Overview

**Program Name:** {{program_name}}
**Target Audience:** {{target_audience}}
**Number of Participants:** {{participant_count}}
**Total Duration:** {{total_duration}}
**Language:** {{language}}
**Delivery Mode:** {{delivery_mode}}

---

## Learning Objectives

By the end of this program, participants will be able to:

1. {{objective_1}}
2. {{objective_2}}
3. {{objective_3}}
4. {{objective_4}}

---

## Program Tracks & Modules

### Track 1: {{track_1_name}}

| Module | Topic | Duration |
|--------|-------|----------|
| 1 | {{module_1_topic}} | {{module_1_duration}} |
| 2 | {{module_2_topic}} | {{module_2_duration}} |
| 3 | {{module_3_topic}} | {{module_3_duration}} |

### Track 2: {{track_2_name}}

| Module | Topic | Duration |
|--------|-------|----------|
| 4 | {{module_4_topic}} | {{module_4_duration}} |
| 5 | {{module_5_topic}} | {{module_5_duration}} |

---

## Schedule & Timeline

{{schedule_details}}

**Start Date:** {{start_date}}
**End Date:** {{end_date}}

---

## Methodology

{{methodology_description}}

Our approach combines:
- {{method_1}}
- {{method_2}}
- {{method_3}}

---

## Investment

| Item | Amount |
|------|--------|
| Program Fee ({{participant_count}} participants) | {{program_fee}} |
| Materials & Resources | {{materials_fee}} |
| **Total Investment** | **{{total_fee}}** |

**Payment Terms:** {{payment_terms}}

---

## About {{vendor_name}}

{{vendor_description}}

---

## Next Steps

1. Review this proposal and share feedback
2. Schedule a follow-up meeting to finalize scope
3. Sign the service agreement
4. Confirm participant list and logistics

---

*This proposal is valid for {{validity_days}} days from {{proposal_date}}.*

**{{sender_name}}**
{{sender_title}}
{{vendor_name}}
{{sender_email}}`

    const naguibVars = [...new Set((naguibContent.match(/\{\{(\w+)\}\}/g) || []).map((m: string) => m.slice(2, -2)))]
    db.prepare(`
      INSERT INTO proposal_templates (name, content, variables, is_premium)
      VALUES (?, ?, ?, 1)
    `).run('Full Multi-Page Proposal (Naguib Selim Style)', naguibContent, JSON.stringify(naguibVars))
  }

  // Seed default communication templates
  const commCount = (db.prepare('SELECT COUNT(*) as c FROM communication_templates').get() as any).c
  if (commCount === 0) {
    const templates = [
      {
        name: 'Demo Confirmation',
        channel: 'whatsapp',
        subject: null,
        body: 'Hello {{instructor_name}},\n\nThis is a confirmation for your demo session at Trainnovation.\n\n📅 Date: {{demo_date}}\n⏰ Time: {{demo_time}}\n📍 Location: {{location}}\n📚 Topic: {{topic}}\n\nPlease confirm your attendance. Looking forward to seeing you!\n\nBest regards,\nTrainnovation Team',
        variables: JSON.stringify(['instructor_name', 'demo_date', 'demo_time', 'location', 'topic']),
        category: 'demo'
      },
      {
        name: 'Certificate Ready',
        channel: 'whatsapp',
        subject: null,
        body: 'Hello {{learner_name}},\n\nCongratulations! 🎉\n\nYour certificate for **{{course_name}}** is now ready.\n\n📜 Certificate No: {{cert_number}}\n📅 Issue Date: {{issue_date}}\n\nPlease contact us to collect your certificate or for the digital copy.\n\nBest regards,\nTrainnovation Team',
        variables: JSON.stringify(['learner_name', 'course_name', 'cert_number', 'issue_date']),
        category: 'certificate'
      },
      {
        name: 'Certificate Ready (Email)',
        channel: 'email',
        subject: 'Your Certificate is Ready – {{course_name}}',
        body: 'Dear {{learner_name}},\n\nWe are pleased to inform you that your certificate of completion for **{{course_name}}** has been issued.\n\nCertificate Number: {{cert_number}}\nIssue Date: {{issue_date}}\n\nKindly reach out to us to arrange collection or request a digital copy.\n\nWarm regards,\nLearning & Development Team\nTrainnovation',
        variables: JSON.stringify(['learner_name', 'course_name', 'cert_number', 'issue_date']),
        category: 'certificate'
      },
      {
        name: 'Proposal Follow-Up',
        channel: 'whatsapp',
        subject: null,
        body: 'Hello {{client_name}},\n\nI hope you are doing well!\n\nI wanted to follow up on the training proposal we shared with you for **{{program_name}}**.\n\nWe would love to hear your feedback and discuss any adjustments that would better fit your needs.\n\nWould you be available for a quick call this week?\n\nBest regards,\n{{sender_name}}\nTrainnovation',
        variables: JSON.stringify(['client_name', 'program_name', 'sender_name']),
        category: 'proposal'
      },
      {
        name: 'Proposal Follow-Up (Email)',
        channel: 'email',
        subject: 'Follow-Up: Training Proposal for {{program_name}}',
        body: 'Dear {{client_name}},\n\nI hope this message finds you well.\n\nI am writing to follow up on the training proposal submitted for **{{program_name}}**. We are eager to support your team\'s development goals and would welcome the opportunity to discuss how we can tailor the program to your needs.\n\nPlease let me know a convenient time for a brief call.\n\nKind regards,\n{{sender_name}}\nLearning & Development Manager\nTrainnovation',
        variables: JSON.stringify(['client_name', 'program_name', 'sender_name']),
        category: 'proposal'
      },
      {
        name: 'Transcript Ready',
        channel: 'whatsapp',
        subject: null,
        body: 'Hello {{learner_name}},\n\nYour academic transcript has been prepared and is ready for collection.\n\n👤 Name: {{learner_name}}\n📅 Issued: {{issue_date}}\n\nPlease visit our office with your ID to collect it, or contact us for the digital version.\n\nBest regards,\nTrainnovation Team',
        variables: JSON.stringify(['learner_name', 'issue_date']),
        category: 'transcript'
      },
    ]
    const stmt = db.prepare(`
      INSERT INTO communication_templates (name, channel, subject, body, variables, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const t of templates) {
      stmt.run(t.name, t.channel, t.subject, t.body, t.variables, t.category)
    }
  }
}
