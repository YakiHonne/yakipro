import { Skeleton } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { useFollowerTimeSeries } from '@/hooks/analytics/useTimeSeries'

export default function FollowerGrowthChart({ pubkey, days = 365 }) {
  const data = useFollowerTimeSeries(pubkey, days)

  if (data === undefined) {
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
  }

  // Build cumulative series
  let cumulative = 0
  const cumData = (data || []).map((entry) => {
    cumulative += entry.count || 0
    return { date: entry.date, followers: cumulative }
  })

  if (cumData.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary, #aaa)', fontSize: '0.9rem' }}>
        No follower data yet
      </div>
    )
  }

  return (
    <BarChart
      dataset={cumData}
      xAxis={[{ scaleType: 'band', dataKey: 'date', tickLabelStyle: { fill: 'var(--color-text-secondary, #aaa)', fontSize: 11 } }]}
      yAxis={[{ tickLabelStyle: { fill: 'var(--color-text-secondary, #aaa)', fontSize: 11 } }]}
      series={[{ dataKey: 'followers', label: 'Followers', color: '#6366f1' }]}
      height={260}
      margin={{ top: 16, right: 16, bottom: 40, left: 56 }}
      tooltip={{ trigger: 'item' }}
      sx={{ width: '100%' }}
    />
  )
}
