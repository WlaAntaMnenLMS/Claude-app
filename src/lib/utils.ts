import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function generateCertNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `CERT-${year}-${rand}`
}

export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))]
}

export function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => data[key.trim()] ?? `{{${key}}}`)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
