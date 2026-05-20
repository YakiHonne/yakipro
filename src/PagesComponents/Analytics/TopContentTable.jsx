import { useState } from 'react'
import { Skeleton } from '@mui/material'
import { useTopContent } from '@/hooks/analytics/useTopContent'
import { format, fromUnixTime } from 'date-fns'

const SORT_KEYS = ['reactionsCount', 'repostsCount', 'zapsCount', 'zapsSats', 'publishedAt']

const KIND_LABELS = {
  1: { label: 'Note', color: '#3b82f6' },
  30023: { label: 'Article', color: '#8b5cf6' },
  30024: { label: 'Draft', color: '#6b7280' },
}

export default function TopContentTable({ pubkey }) {
  const rows = useTopContent(pubkey, 10)
  const [sortKey, setSortKey] = useState('reactionsCount')
  const [asc, setAsc] = useState(false)

  const toggleSort = (key) => {
    if (sortKey === key) setAsc((a) => !a)
    else { setSortKey(key); setAsc(false) }
  }

  if (rows === undefined) {
    return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
  }

  const sorted = [...(rows || [])].sort((a, b) => {
    const diff = (a[sortKey] || 0) - (b[sortKey] || 0)
    return asc ? diff : -diff
  })

  const SortHeader = ({ label, sortId }) => (
    <th
      onClick={() => toggleSort(sortId)}
      style={{
        cursor: 'pointer',
        padding: '0.75rem 0.5rem',
        textAlign: 'right',
        fontSize: '0.8rem',
        color: sortKey === sortId ? '#f59e0b' : 'var(--color-text-secondary, #aaa)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label} {sortKey === sortId ? (asc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary, #aaa)', textAlign: 'center', padding: '2rem' }}>
          No content yet
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border, #333)' }}>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary, #aaa)' }}>#</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary, #aaa)' }}>Content</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-secondary, #aaa)' }}>Kind</th>
              <SortHeader label="Date" sortId="publishedAt" />
              <SortHeader label="❤️" sortId="reactionsCount" />
              <SortHeader label="🔁" sortId="repostsCount" />
              <SortHeader label="⚡" sortId="zapsCount" />
              <SortHeader label="Sats" sortId="zapsSats" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const kindInfo = KIND_LABELS[row.kind] || { label: String(row.kind), color: '#6b7280' }
              return (
                <tr
                  key={row.eventId}
                  style={{ borderBottom: '1px solid var(--color-border-muted, #222)' }}
                >
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-secondary, #aaa)', fontSize: '0.85rem' }}>{i + 1}</td>
                  <td style={{ padding: '0.75rem 0.5rem', maxWidth: 220 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary, #fff)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.title || row.summary || '(no content)'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ background: kindInfo.color + '22', color: kindInfo.color, borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {kindInfo.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-secondary, #aaa)' }}>
                    {row.publishedAt ? format(fromUnixTime(row.publishedAt), 'MMM d') : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-primary, #fff)' }}>{row.reactionsCount || 0}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-primary, #fff)' }}>{row.repostsCount || 0}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-primary, #fff)' }}>{row.zapsCount || 0}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.85rem', color: '#f59e0b' }}>{(row.zapsSats || 0).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
