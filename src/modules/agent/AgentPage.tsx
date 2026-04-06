import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, Trash2, Loader2, Zap, Users, CalendarDays, FileText, Award, BookOpen, Package } from 'lucide-react'
import { api } from '@/lib/ipc'
import { cn } from '@/lib/utils'

interface Message { role: 'user' | 'assistant'; text: string; route?: string }

const QUICK_ACTIONS = [
  { label: 'Show all instructors', icon: Users, msg: 'Show me all instructors' },
  { label: 'Schedule a demo', icon: CalendarDays, msg: 'I need to schedule a demo session' },
  { label: 'Write a proposal', icon: FileText, msg: 'Help me write a training proposal' },
  { label: 'Fill certificates', icon: Award, msg: 'I need to fill certificate templates' },
  { label: 'Create transcript', icon: BookOpen, msg: 'I need to fill a transcript' },
  { label: 'Order from Doxx', icon: Package, msg: 'I need to order physical copies from Doxx' },
]

export default function AgentPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hello Ahmed! I'm JARVIS, your L&D assistant. I can help you schedule demos, write proposals, fill certificates, manage instructors, and more. What do you need today?",
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.agent.getHistory().then(history => {
      if (history.length > 0) {
        const msgs: Message[] = history.map(h => ({
          role: h.role as 'user' | 'assistant',
          text: h.content,
          route: h.module || undefined,
        }))
        setMessages([messages[0], ...msgs.slice(-20)])
      }
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await api.agent.chat(msg)
      setMessages(m => [...m, {
        role: 'assistant',
        text: res.message,
        route: res.route,
      }])
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        text: 'Sorry, I ran into an issue. Please check that JARVIS is configured correctly.',
      }])
    } finally {
      setLoading(false)
    }
  }

  async function clearHistory() {
    if (!confirm('Clear all conversation history?')) return
    await api.agent.clearHistory()
    setMessages([{
      role: 'assistant',
      text: "Hello Ahmed! Conversation cleared. How can I help you?",
    }])
  }

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">JARVIS</h1>
            <p className="text-xs text-muted-foreground">Your L&D AI Assistant</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Online
          </span>
        </div>
        <button onClick={clearHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary hover:bg-accent rounded-lg">
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {QUICK_ACTIONS.map(({ label, icon: Icon, msg }) => (
          <button key={label} onClick={() => send(msg)}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border hover:border-primary/50 hover:bg-accent rounded-xl text-xs text-left transition-colors">
            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              'max-w-[70%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-card border border-border rounded-tl-sm'
            )}>
              {msg.text}
              {msg.route && msg.role === 'assistant' && (
                <button
                  onClick={() => navigate(msg.route!)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <span>→</span> Open {msg.route.replace('/', '')}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask JARVIS anything… (English or Arabic)"
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        JARVIS uses local AI (Ollama) when available, falls back to Claude API
      </p>
    </div>
  )
}
