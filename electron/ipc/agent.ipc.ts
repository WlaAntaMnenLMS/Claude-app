import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'
import Anthropic from '@anthropic-ai/sdk'
import https from 'https'
import http from 'http'

interface Message { role: 'user' | 'assistant'; content: string }

const BASE_SYSTEM = `You are JARVIS, the smart AI assistant for the L&D Assistant app at Trainnovation, Cairo.
You work for the L&D manager (Ahmed Younes). You have FULL access to the live database via the snapshot below.

RULES:
- ALWAYS answer questions using the snapshot data — names, counts, dates.
- DO NOT just say "go to the page". Actually answer the question first, THEN optionally mention the page.
- Keep replies concise (2–4 sentences max).
- Match the user's language (Arabic or English).
- When asked about upcoming demos: list the name, date, and topic.
- When asked about instructors: list names and statuses.
- When asked about counts: give the exact number from snapshot.
- For actions (schedule demo, write proposal, create certificate): describe what to do AND set action+route so the UI can navigate.

RESPOND with valid JSON only:
{
  "intent": "schedule_demo | hire_instructor | write_proposal | fill_certificate | fill_transcript | doxx_order | view_instructors | view_demos | view_proposals | view_certificates | view_transcripts | view_doxx | general",
  "entities": {},
  "response": "Your answer here — cite real names/numbers from the snapshot",
  "action": "navigate | show_info | none",
  "route": "/instructors | /demos | /proposals | /certificates | /transcripts | /doxx | null"
}`

function buildDbSnapshot(): string {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)

  const demos = (db.prepare(`
    SELECT d.scheduled_at, d.topic, d.status, d.duration_mins, d.location, i.full_name AS instructor_name
    FROM demo_sessions d
    LEFT JOIN instructors i ON d.instructor_id = i.id
    ORDER BY d.scheduled_at ASC LIMIT 20
  `).all() as any[])

  const instructors = (db.prepare(
    `SELECT full_name, status, specialization, rating FROM instructors ORDER BY created_at DESC LIMIT 20`
  ).all() as any[])

  const proposals = (db.prepare(`
    SELECT p.title, p.status, c.name AS client_name
    FROM proposals p LEFT JOIN clients c ON p.client_id = c.id
    ORDER BY p.created_at DESC LIMIT 10
  `).all() as any[])

  const learnerCount = (db.prepare('SELECT COUNT(*) as n FROM learners').get() as any).n
  const certCount = (db.prepare('SELECT COUNT(*) as n FROM certificates').get() as any).n

  let snap = '\n\n=== LIVE DATABASE SNAPSHOT ===\n'

  // Demos
  const upcoming = demos.filter(d => d.scheduled_at > now)
  const past = demos.filter(d => d.scheduled_at <= now)
  if (upcoming.length > 0) {
    snap += '\nUpcoming Demo Sessions:\n'
    upcoming.forEach(d => {
      const date = new Date(d.scheduled_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      snap += `  - ${d.instructor_name || 'Unknown'}: ${date}, Topic: ${d.topic || 'N/A'}, Duration: ${d.duration_mins || 60} min${d.location ? `, Location: ${d.location}` : ''}\n`
    })
  } else {
    snap += '\nUpcoming Demo Sessions: None scheduled\n'
  }
  if (past.length > 0) {
    snap += '\nPast Demo Sessions:\n'
    past.slice(-5).forEach(d => {
      const date = new Date(d.scheduled_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      snap += `  - ${d.instructor_name || 'Unknown'}: ${date}, Status: ${d.status}\n`
    })
  }

  // Instructors
  if (instructors.length > 0) {
    snap += '\nInstructors:\n'
    instructors.forEach(i => {
      snap += `  - ${i.full_name}: ${i.status}${i.specialization ? `, ${i.specialization}` : ''}${i.rating ? `, Rating: ${i.rating}/5` : ''}\n`
    })
  } else {
    snap += '\nInstructors: None added yet\n'
  }

  // Proposals
  if (proposals.length > 0) {
    snap += '\nRecent Proposals:\n'
    proposals.forEach(p => {
      snap += `  - "${p.title}": ${p.status}${p.client_name ? ` for ${p.client_name}` : ''}\n`
    })
  }

  snap += `\nLearners in DB: ${learnerCount}, Certificates issued: ${certCount}\n`
  snap += '=== END SNAPSHOT ===\n'
  return snap
}

async function checkOllama(): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get('http://127.0.0.1:11434/api/tags', res => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(2000, () => { req.destroy(); resolve(false) })
  })
}

async function queryOllama(messages: Message[], systemPrompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama3.2:3b',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: false,
      format: 'json',
    })
    const req = http.request({
      hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data).message?.content || '{}') }
        catch { reject(new Error('Invalid Ollama response')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Ollama timeout')) })
    req.write(body); req.end()
  })
}

async function queryClaude(messages: Message[], systemPrompt: string): Promise<string> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })
  return (response.content[0] as any).text
}

function fallbackResponse(userMessage: string): object {
  const lower = userMessage.toLowerCase()
  const db = getDb()

  // Try to answer from live data
  if (lower.includes('demo') || lower.includes('schedule') || lower.includes('upcoming') || lower.includes('next')) {
    const now = Math.floor(Date.now() / 1000)
    const upcoming = (db.prepare(`
      SELECT d.scheduled_at, d.topic, i.full_name AS name
      FROM demo_sessions d LEFT JOIN instructors i ON d.instructor_id = i.id
      WHERE d.scheduled_at > ? ORDER BY d.scheduled_at ASC LIMIT 3
    `).all(now) as any[])
    if (upcoming.length > 0) {
      const list = upcoming.map(d => {
        const date = new Date(d.scheduled_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        return `${d.name || 'Unknown'} on ${date}${d.topic ? ` (${d.topic})` : ''}`
      }).join('; ')
      return { intent: 'view_demos', entities: {}, response: `Upcoming demos: ${list}.`, action: 'navigate', route: '/demos' }
    }
    return { intent: 'view_demos', entities: {}, response: 'No upcoming demos are scheduled right now.', action: 'navigate', route: '/demos' }
  }

  if (lower.includes('instructor') || lower.includes('hire') || lower.includes('applicant')) {
    const instructors = (db.prepare('SELECT full_name, status FROM instructors ORDER BY created_at DESC LIMIT 5').all() as any[])
    if (instructors.length > 0) {
      const list = instructors.map(i => `${i.full_name} (${i.status})`).join(', ')
      return { intent: 'view_instructors', entities: {}, response: `Current instructors: ${list}.`, action: 'navigate', route: '/instructors' }
    }
    return { intent: 'view_instructors', entities: {}, response: 'No instructors added yet.', action: 'navigate', route: '/instructors' }
  }

  if (lower.includes('proposal')) {
    const count = (db.prepare('SELECT COUNT(*) as n FROM proposals').get() as any)?.n || 0
    return { intent: 'write_proposal', entities: {}, response: `You have ${count} proposal(s). Open Proposals to write a new one or view existing ones.`, action: 'navigate', route: '/proposals' }
  }

  if (lower.includes('certificate') || lower.includes('cert') || lower.includes('شهادة')) {
    const count = (db.prepare('SELECT COUNT(*) as n FROM certificates').get() as any)?.n || 0
    const learners = (db.prepare('SELECT COUNT(*) as n FROM learners').get() as any)?.n || 0
    return { intent: 'fill_certificate', entities: {}, response: `You have ${count} certificate(s) issued for ${learners} learner(s) in the database.`, action: 'navigate', route: '/certificates' }
  }

  if (lower.includes('transcript')) {
    const count = (db.prepare('SELECT COUNT(*) as n FROM transcripts').get() as any)?.n || 0
    return { intent: 'fill_transcript', entities: {}, response: `You have ${count} transcript(s) on record.`, action: 'navigate', route: '/transcripts' }
  }

  if (lower.includes('doxx') || lower.includes('print') || lower.includes('order')) {
    return { intent: 'doxx_order', entities: {}, response: 'Open Doxx Orders to track physical certificate printing requests.', action: 'navigate', route: '/doxx' }
  }

  if (lower.includes('learner') || lower.includes('student')) {
    const count = (db.prepare('SELECT COUNT(*) as n FROM learners').get() as any)?.n || 0
    return { intent: 'general', entities: {}, response: `There are ${count} learner(s) in the database. Go to Certificates → Learners to manage them.`, action: 'show_info', route: null }
  }

  return { intent: 'general', entities: {}, response: "I'm here to help. Ask me about demos, instructors, proposals, certificates, or learners.", action: 'none', route: null }
}

export function registerAgentIpc() {
  const db = () => getDb()

  ipcMain.handle('agent:chat', async (_e, userMessage: string) => {
    db().prepare("INSERT INTO agent_history (role, content) VALUES ('user', ?)").run(userMessage)

    const history = (db().prepare(
      "SELECT role, content FROM agent_history ORDER BY created_at DESC LIMIT 10"
    ).all() as Message[]).reverse()

    // Build system prompt with live DB snapshot
    const systemPrompt = BASE_SYSTEM + buildDbSnapshot()

    let responseText = '', parsed: any = null
    try {
      const ollamaUp = await checkOllama()
      responseText = ollamaUp
        ? await queryOllama(history, systemPrompt)
        : await queryClaude(history, systemPrompt)
      parsed = JSON.parse(responseText)
    } catch {
      parsed = fallbackResponse(userMessage)
    }

    const assistantContent = parsed.response || "I'm ready to help!"
    db().prepare(
      "INSERT INTO agent_history (role, content, intent, module) VALUES ('assistant', ?, ?, ?)"
    ).run(assistantContent, parsed.intent || null, parsed.route || null)

    return { message: assistantContent, intent: parsed.intent, route: parsed.route, action: parsed.action, entities: parsed.entities || {} }
  })

  ipcMain.handle('agent:getHistory', () =>
    db().prepare("SELECT * FROM agent_history ORDER BY created_at ASC LIMIT 100").all()
  )

  ipcMain.handle('agent:clearHistory', () => {
    db().prepare("DELETE FROM agent_history").run()
    return { success: true }
  })
}
