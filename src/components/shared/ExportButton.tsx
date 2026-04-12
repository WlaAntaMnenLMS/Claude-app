import { useState } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  module: string
  className?: string
}

export default function ExportButton({ module, className }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [filePath, setFilePath] = useState('')

  async function handleExport() {
    setState('loading')
    const res = await (window as any).api.export.toExcel(module)
    if (res.success) {
      setFilePath(res.filePath)
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } else {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  function handleOpen() {
    if (filePath) (window as any).api.export.openFile(filePath)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleExport}
        disabled={state === 'loading'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          state === 'done'  ? 'bg-green-500/15 text-green-400' :
          state === 'error' ? 'bg-red-500/15 text-red-400' :
          'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
          className
        )}
        title="Export to Excel"
      >
        {state === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
         state === 'done'    ? <Check className="w-3.5 h-3.5" /> :
                               <Download className="w-3.5 h-3.5" />}
        {state === 'loading' ? 'Exporting…' :
         state === 'done'    ? 'Exported!' :
         state === 'error'   ? 'Failed' : 'Export Excel'}
      </button>
      {state === 'done' && filePath && (
        <button onClick={handleOpen} className="text-xs text-blue-400 hover:underline">Open file</button>
      )}
    </div>
  )
}
