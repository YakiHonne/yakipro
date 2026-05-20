import { useSelector } from 'react-redux'
import { selectLiveEvents } from '@/Store/analyticsSlice'
import { formatDistanceToNow, fromUnixTime } from 'date-fns'

export default function LiveActivityTicker() {
  const liveEvents = useSelector(selectLiveEvents)
  const visible = liveEvents.slice(0, 5)

  if (visible.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      {visible.map((event, i) => (
        <div
          key={event.id}
          style={{
            background: 'var(--color-bg-surface, #1a1a1a)',
            border: '1px solid var(--color-border, #333)',
            borderRadius: 8,
            padding: '0.6rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            opacity: 1 - i * 0.15,
            transform: `translateX(${i * 0}px)`,
            animation: 'slideIn 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            minWidth: 180,
          }}
        >
          <span style={{ fontSize: '1rem' }}>{event.summary.split(' ')[0]}</span>
          <span style={{ color: 'var(--color-text-primary, #fff)', flex: 1 }}>
            {event.summary}
          </span>
          <span style={{ color: 'var(--color-text-secondary, #aaa)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            {formatDistanceToNow(fromUnixTime(event.timestamp), { addSuffix: true })}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
