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
  `)
}
