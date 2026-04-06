import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/ipc'

interface Message { role: 'user' | 'assistant'; text: string; route?: string }

export default function AgentFloat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi Ahmed! I'm JARVIS. Ask me anything or tell me what you need to do." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function send() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await api.agent.chat(text)
      setMessages(m => [...m, { role: 'assistant', text: res.message, route: res.route }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, I had trouble responding. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleNavigate(route: string) {
    navigate(route)
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all z-50',
          open ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
          'text-primary-foreground'
        )}
        title="JARVIS Agent"
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </button>

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/80">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">JARVIS</span>
            <span className="ml-auto text-xs text-muted-foreground">AI Assistant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground'
                )}>
                  {msg.text}
                  {msg.route && (
                    <button
                      onClick={() => handleNavigate(msg.route!)}
                      className="block mt-1 text-xs underline opacity-70 hover:opacity-100"
                    >
                      Open →
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-xl px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-border">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask JARVIS..."
              className="flex-1 bg-secondary rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
