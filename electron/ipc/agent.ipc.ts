import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'
import Anthropic from '@anthropic-ai/sdk'
import https from 'https'
import http from 'http'

interface Message { role: 'user' | 'assistant'; content: string }

const BASE_SYSTEM = `You are JARVIS, an AI assistant for Ahmed Younes, a Learning & Development Manager at Trainnovation in Cairo, Egypt.

You help with these tasks:
1. Instructor hiring & tracking (finding, scheduling demos, evaluating)
2. Demo session scheduling (calendar, reminders, feedback)
3. Training proposal writing (for clients, using templates)
4. Certificate filling (bulk generation from DOCX templates)
5. Transcript filling (learner course records)
6. Doxx orders (physical printing of certificates/transcripts)
7. General L&D advice

A LIVE DATABASE SNAPSHOT is appended to this prompt — use it to answer questions about actual data.
When the user asks "who has a demo scheduled", "upcoming demos", "what's next", etc., use the snapshot data to give specific names and dates.
Format dates as human-readable (e.g. "10 January 2026").

When the user sends a message, ALWAYS respond with valid JSON:
{
  "intent": "schedule_demo | hire_instructor | write_proposal | fill_certificate | fill_transcript | doxx_order | view_instructors | view_demos | view_proposals | view_certificates | view_transcripts | view_doxx | general",
  "entities": {},
  "response": "Natural language reply in English or Arabic matching user's language",
  "action": "navigate | fill_form | show_info | ask_clarification | none",
  "route": "/instructors | /demos | /proposals | /certificates | /transcripts | /doxx | null"
}

Always respond in the same language the user writes in (Arabic or English).
Be concise, friendly, and professional. When answering data questions, list actual names and dates from the snapshot.`

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
    max_tokens: 600,
    system: systemPrompt,
    messages,
  })
  return (response.content[0] as any).text
}

function fallbackResponse(userMessage: string): object {
  const lower = userMessage.toLowerCase()
  let intent = 'general', route: string | null = null
  let response = "I'm here to help! What would you like to do?"

  if (lower.includes('demo') || lower.includes('schedule')) {
    intent = 'schedule_demo'; route = '/demos'; response = "Let me open the Demo Sessions for you."
  } else if (lower.includes('instructor') || lower.includes('hire')) {
    intent = 'view_instructors'; route = '/instructors'; response = "Opening Instructor Hiring."
  } else if (lower.includes('proposal')) {
    intent = 'write_proposal'; route = '/proposals'; response = "Opening the Proposal Writer."
  } else if (lower.includes('certificate') || lower.includes('cert')) {
    intent = 'fill_certificate'; route = '/certificates'; response = "Opening Certificate Filler."
  } else if (lower.includes('transcript')) {
    intent = 'fill_transcript'; route = '/transcripts'; response = "Opening the Transcript module."
  } else if (lower.includes('doxx') || lower.includes('print') || lower.includes('order')) {
    intent = 'doxx_order'; route = '/doxx'; response = "Opening Doxx Orders."
  }
  return { intent, entities: {}, response, action: route ? 'navigate' : 'show_info', route }
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
