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

  // Build cumulative series
  let cumulative = 0
  const cumData = (data || []).map((entry) => {
    cumulative += entry.count || 0
    return { date: entry.date, followers: cumulative, count: entry.count || 0 }
  })

  if (cumData.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary, #aaa)', fontSize: '0.9rem' }}>
        {t('A8RA6c7')}
      </div>
    )
  }

  return (
    <BarChart
      dataset={cumData}
      xAxis={[{ scaleType: 'band', dataKey: 'date', tickLabelStyle: { fill: 'var(--color-text-secondary, #aaa)', fontSize: 11 } }]}
      yAxis={[{ tickLabelStyle: { fill: 'var(--color-text-secondary, #aaa)', fontSize: 11 } }]}
      series={[{ dataKey: 'followers', label: t('AtlqBGm'), color: '#6366f1' }]}
      height={260}
      margin={{ top: 16, right: 16, bottom: 40, left: 56 }}
      tooltip={{ trigger: 'item' }}
      onAxisClick={(_, axisData) => {
        const entry = cumData[axisData?.dataIndex]
        if (entry && onBarClick)
          onBarClick({ dateStr: entry.date, bucket, value: entry.count, type: 'followers' })
      }}
      sx={{
        width: '100%',
        cursor: onBarClick ? 'pointer' : 'default',
        '& .MuiChartsLegend-label': {
          color: 'var(--color-text-secondary, #aaa)',
        },
      }}
    />
  )
}
