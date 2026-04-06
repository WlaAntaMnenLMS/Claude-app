import { statusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  applied:        'Applied',
  demo_scheduled: 'Demo Scheduled',
  demo_done:      'Demo Done',
  hired:          'Hired',
  rejected:       'Rejected',
  scheduled:      'Scheduled',
  done:           'Done',
  cancelled:      'Cancelled',
  draft:          'Draft',
  sent:           'Sent',
  approved:       'Approved',
  pending:        'Pending',
  submitted:      'Submitted',
  processing:     'Processing',
  delivered:      'Delivered',
}

interface Props { status: string; className?: string }

export default function StatusBadge({ status, className }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      statusColor(status),
      className
    )}>
      {LABELS[status] || status}
    </span>
  )
}
