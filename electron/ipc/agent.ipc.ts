import { ipcMain } from 'electron'
import { getDb } from '../services/db.service'
import Anthropic from '@anthropic-ai/sdk'
import https from 'https'

interface Message { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `You are JARVIS, an AI assistant for Ahmed Younes, a Learning & Development Manager at Trainnovation in Cairo, Egypt.

You help with these tasks:
1. Instructor hiring & tracking (finding, scheduling demos, evaluating)
2. Demo session scheduling (calendar, reminders, feedback)
3. Training proposal writing (for clients, using templates)
4. Certificate filling (bulk generation from DOCX templates)
5. Transcript filling (learner course records)
6. Doxx orders (physical printing of certificates/transcripts)
7. General L&D advice

When the user sends a message, ALWAYS respond with valid JSON:
{
  "intent": "schedule_demo | hire_instructor | write_proposal | fill_certificate | fill_transcript | doxx_order | view_instructors | view_demos | view_proposals | view_certificates | view_transcripts | view_doxx | general",
  "entities": {},
  "response": "Natural language reply in English or Arabic matching user's language",
  "action": "navigate | fill_form | show_info | ask_clarification | none",
  "route": "/instructors | /demos | /proposals | /certificates | /transcripts | /doxx | null"
}

Examples:
- "Schedule a demo for tomorrow" → intent: schedule_demo, route: /demos
- "I need to write a proposal for ABC company" → intent: write_proposal, route: /proposals
- "Fill certificates for today's batch" → intent: fill_certificate, route: /certificates
- "Show me all instructors" → intent: view_instructors, route: /instructors
- "Order physical copies from Doxx" → intent: doxx_order, route: /doxx

Always respond in the same language the user writes in (Arabic or English).
Be concise, friendly, and professional.`

async function checkOllama(): Promise<boolean> {
  return new Promise(resolve => {
    const req = https.get('http://127.0.0.1:11434/api/tags', res => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(2000, () => { req.destroy(); resolve(false) })
  })
}

async function queryOllama(messages: Message[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama3.2:3b',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: false,
      format: 'json',
    })

    const req = https.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(parsed.message?.content || '{}')
        } catch { reject(new Error('Invalid Ollama response')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Ollama timeout')) })
    req.write(body)
    req.end()
  })
}

async function queryClaude(messages: Message[]): Promise<string> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  })
  return (response.content[0] as any).text
}

function fallbackResponse(userMessage: string): object {
  const lower = userMessage.toLowerCase()
  let intent = 'general'
  let route = null
  let response = "I'm here to help! What would you like to do?"

  if (lower.includes('demo') || lower.includes('schedule')) {
    intent = 'schedule_demo'; route = '/demos'
    response = "Let me take you to the Demo Scheduling section."
  } else if (lower.includes('instructor') || lower.includes('hire')) {
    intent = 'view_instructors'; route = '/instructors'
    response = "Opening the Instructor Hiring module."
  } else if (lower.includes('proposal')) {
    intent = 'write_proposal'; route = '/proposals'
    response = "Let me open the Proposal Writer for you."
  } else if (lower.includes('certificate') || lower.includes('cert')) {
    intent = 'fill_certificate'; route = '/certificates'
    response = "Opening the Certificate Filler."
  } else if (lower.includes('transcript')) {
    intent = 'fill_transcript'; route = '/transcripts'
    response = "Opening the Transcript module."
  } else if (lower.includes('doxx') || lower.includes('print') || lower.includes('order')) {
    intent = 'doxx_order'; route = '/doxx'
    response = "Opening the Doxx Orders module."
  }

  return { intent, entities: {}, response, action: route ? 'navigate' : 'show_info', route }
}

export function registerAgentIpc() {
  const db = () => getDb()

  ipcMain.handle('agent:chat', async (_e, userMessage: string) => {
    // Save user message
    db().prepare("INSERT INTO agent_history (role, content) VALUES ('user', ?)").run(userMessage)

    // Get recent history (last 10)
    const history = (db().prepare(
      "SELECT role, content FROM agent_history ORDER BY created_at DESC LIMIT 10"
    ).all() as Message[]).reverse()

    let responseText = ''
    let parsed: any = null

    try {
      const ollamaUp = await checkOllama()
      if (ollamaUp) {
        responseText = await queryOllama(history)
      } else {
        responseText = await queryClaude(history)
      }
      parsed = JSON.parse(responseText)
    } catch {
      parsed = fallbackResponse(userMessage)
    }

    const assistantContent = parsed.response || "I'm ready to help!"

    // Save assistant response
    db().prepare(
      "INSERT INTO agent_history (role, content, intent, module) VALUES ('assistant', ?, ?, ?)"
    ).run(assistantContent, parsed.intent || null, parsed.route || null)

    return {
      message: assistantContent,
      intent: parsed.intent,
      route: parsed.route,
      action: parsed.action,
      entities: parsed.entities || {},
    }
  })

  ipcMain.handle('agent:getHistory', () =>
    db().prepare("SELECT * FROM agent_history ORDER BY created_at ASC LIMIT 100").all()
  )

  ipcMain.handle('agent:clearHistory', () => {
    db().prepare("DELETE FROM agent_history").run()
    return { success: true }
  })
}
