import { Skeleton } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { useTranslation } from 'react-i18next'
import { useFollowerTimeSeries, bucketFor } from '@/hooks/analytics/useTimeSeries'

export default function FollowerGrowthChart({ pubkey, days = 365, onBarClick }) {
  const { t } = useTranslation()
  const data = useFollowerTimeSeries(pubkey, days)
  const bucket = bucketFor(days)

  if (data === undefined) {
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
  }

  // Per-period series: each bar is the number of followers gained *within* that
  // bucket, never a running total — a cumulative series can only ever climb and
  // hides the periods where growth actually slowed.
  const chartData = (data || []).map((entry) => ({
    date: entry.date,
    followers: entry.count || 0,
  }))

  if (chartData.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
        {t('A8RA6c7')}
      </div>
    )
  }

  return (
    <BarChart
      dataset={chartData}
      xAxis={[{ scaleType: 'band', dataKey: 'date', tickLabelStyle: { fill: 'var(--color-text-secondary)', fontSize: 11 } }]}
      yAxis={[{ tickLabelStyle: { fill: 'var(--color-text-secondary)', fontSize: 11 } }]}
      series={[{ dataKey: 'followers', label: t('AtlqBGm'), color: '#6366f1' }]}
      height={260}
      margin={{ top: 16, right: 16, bottom: 40, left: 56 }}
      tooltip={{ trigger: 'item' }}
      onAxisClick={(_, axisData) => {
        const entry = chartData[axisData?.dataIndex]
        if (entry && onBarClick)
          onBarClick({ dateStr: entry.date, bucket, value: entry.followers, type: 'followers' })
      }}
      sx={{
        width: '100%',
        cursor: onBarClick ? 'pointer' : 'default',
        '& .MuiChartsLegend-label': {
          color: 'var(--color-text-secondary)',
        },
      }}
    />
  )
}
