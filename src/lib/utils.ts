import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, fromUnixTime } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(unixTs: number | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!unixTs) return '—'
  return format(fromUnixTime(unixTs), fmt)
}

export function formatDateTime(unixTs: number | null | undefined): string {
  if (!unixTs) return '—'
  return format(fromUnixTime(unixTs), 'dd MMM yyyy, HH:mm')
}

export function toUnixTs(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    applied:        'bg-blue-500/20 text-blue-300',
    demo_scheduled: 'bg-yellow-500/20 text-yellow-300',
    demo_done:      'bg-purple-500/20 text-purple-300',
    hired:          'bg-green-500/20 text-green-300',
    rejected:       'bg-red-500/20 text-red-300',
    scheduled:      'bg-yellow-500/20 text-yellow-300',
    done:           'bg-green-500/20 text-green-300',
    cancelled:      'bg-red-500/20 text-red-300',
    draft:          'bg-gray-500/20 text-gray-300',
    sent:           'bg-blue-500/20 text-blue-300',
    approved:       'bg-green-500/20 text-green-300',
    rejected_p:     'bg-red-500/20 text-red-300',
    pending:        'bg-orange-500/20 text-orange-300',
    submitted:      'bg-blue-500/20 text-blue-300',
    processing:     'bg-yellow-500/20 text-yellow-300',
    delivered:      'bg-green-500/20 text-green-300',
  }
  return map[status] || 'bg-gray-500/20 text-gray-300'
}

export function generateCertNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `CERT-${year}-${seq}`
}
