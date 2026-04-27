function pad(n: number) { return String(n).padStart(2, '0') }

function toIcsDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    '00Z'
  )
}

function uid() {
  return Math.random().toString(36).slice(2) + '-' + Date.now() + '@ld-assistant'
}

export interface IcsEvent {
  title: string
  startUnix: number
  durationMins: number
  location?: string
  description?: string
}

export function generateIcs(event: IcsEvent): string {
  const start = toIcsDate(event.startUnix)
  const end = toIcsDate(event.startUnix + event.durationMins * 60)
  const now = toIcsDate(Math.floor(Date.now() / 1000))
  const desc = (event.description || '').replace(/\n/g, '\\n')
  const loc = event.location || ''

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//L&D Assistant//Trainnovation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid()}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    ...(loc ? [`LOCATION:${loc}`] : []),
    ...(desc ? [`DESCRIPTION:${desc}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(event: IcsEvent, filename: string) {
  const content = generateIcs(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
