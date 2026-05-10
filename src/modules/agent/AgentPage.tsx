import { useEffect, useRef, useState } from 'react'
import { Send, Zap, Trash2, Bot, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { agentHistory, type AgentMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

const SYSTEM_PROMPT = `You are JARVIS, an AI assistant for Trainnovation's Learning & Development team.

You help with:
- Instructor hiring pipeline (tracking applications, demo sessions, hiring decisions)
- Demo session scheduling
- Training proposal writing
- Certificate and transcript generation
- Doxx physical copy orders
- Communication templates (WhatsApp/Email)

When the user asks to do something, respond with JSON in this exact format:
{
  "intent": "schedule_demo|hire_instructor|write_proposal|fill_certificate|fill_transcript|doxx_order|communicate|show_info|ask_clarification",
  "module": "instructors|demos|proposals|certificates|transcripts|doxx|communication|dashboard",
  "entities": {},
  "response": "Your natural language reply here",
  "action": "open_module|fill_form|show_info|ask_clarification"
}

Always include the "response" field with a helpful, friendly reply. Be concise and professional.
If you cannot determine the intent, use "show_info" and ask a clarifying question in "response".`

interface ParsedResponse {
  intent?: string
  module?: string
  response: string
  action?: string
  entities?: Record<string, unknown>
}

const MODULE_ROUTES: Record<string, string> = {
  instructors: '/instructors',
  demos: '/demos',
  proposals: '/proposals',
  certificates: '/certificates',
  transcripts: '/transcripts',
  doxx: '/doxx',
  communication: '/communication',
  dashboard: '/dashboard',
}

function parseAssistantResponse(text: string): ParsedResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as ParsedResponse
    } catch {
      // fall through
    }
  }
  return { response: text, intent: 'show_info', action: 'show_info' }
}

export default function AgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') ?? '')
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    agentHistory.list(50).then(setMessages)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')
    setLoading(true)

    const userMsg: AgentMessage = {
      id: Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    }
    setMessages(m => [...m, userMsg])

    try {
      await agentHistory.add({ role: 'user', content: userText })

      const context = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      let assistantText = ''

      if (apiKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-allow-browser': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: SYSTEM_PROMPT,
            messages: [...context, { role: 'user', content: userText }],
          }),
        })
        const data = await res.json() as { content?: { text?: string }[] }
        assistantText = data.content?.[0]?.text ?? 'Sorry, I could not get a response.'
      } else {
        assistantText = JSON.stringify({
          intent: 'show_info',
          response: 'Please set your Claude API key in Settings to enable JARVIS. Go to Settings → Claude API Key.',
          action: 'open_module',
          module: 'settings',
        })
      }

      const parsed = parseAssistantResponse(assistantText)

      const assistantMsg: AgentMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: assistantText,
        intent: parsed.intent,
        module: parsed.module,
        created_at: new Date().toISOString(),
      }
      setMessages(m => [...m, assistantMsg])
      await agentHistory.add({ role: 'assistant', content: assistantText, intent: parsed.intent, module: parsed.module })
    } catch (err) {
      const errMsg: AgentMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: JSON.stringify({ response: 'Error: ' + (err instanceof Error ? err.message : 'Unknown error'), intent: 'show_info' }),
        created_at: new Date().toISOString(),
      }
      setMessages(m => [...m, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear all conversation history?')) return
    await agentHistory.clear()
    setMessages([])
  }

  const renderMessage = (msg: AgentMessage) => {
    const isUser = msg.role === 'user'
    const parsed = isUser ? null : parseAssistantResponse(msg.content)
    const displayText = parsed?.response ?? msg.content

    return (
      <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-700' : 'bg-amber-600'}`}>
          {isUser ? <User size={14} /> : <Zap size={14} />}
        </div>
        <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
          }`}>
            {displayText}
          </div>

          {/* Action card */}
          {parsed?.module && parsed.action === 'open_module' && MODULE_ROUTES[parsed.module] && (
            <button
              onClick={() => navigate(MODULE_ROUTES[parsed.module!]!)}
              className="text-xs px-3 py-1.5 bg-amber-500/20 border border-amber-700 text-amber-300 rounded-lg hover:bg-amber-500/30 transition"
            >
              → Open {parsed.module}
            </button>
          )}

          <span className="text-xs text-gray-600">{formatDateTime(msg.created_at)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
            <Zap size={16} />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">JARVIS</h1>
            <p className="text-xs text-gray-500">L&D AI Assistant · {apiKey ? 'Claude API' : 'No API key set'}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-gray-500 hover:text-red-400 transition" title="Clear history">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-600/20 border border-amber-700 flex items-center justify-center">
              <Zap size={28} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Hello, I'm JARVIS</p>
              <p className="text-sm text-gray-500 mt-1">Your L&D assistant. Ask me anything.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Schedule a demo for tomorrow at 2pm',
                'Who are our hired instructors?',
                'Create a new proposal for leadership training',
                'How many demos do we have this week?',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-full transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(renderMessage)}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
              <Zap size={14} />
            </div>
            <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-500 flex gap-1 items-center">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 shrink-0">
        {!apiKey && (
          <p className="text-xs text-amber-500 mb-2 flex items-center gap-1">
            ⚠ No Claude API key set. Go to <button onClick={() => navigate('/settings')} className="underline">Settings</button> to enable JARVIS.
          </p>
        )}
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask JARVIS anything… (e.g. schedule a demo, who's hired?)"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-600 transition"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white transition"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
