export default function ChartMini({ points = [], width = 220, height = 26, color = '#35c9e8' }) {
  if (!points.length) return null

  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = width / (points.length - 1 || 1)

  const path = points
    .map((p, i) => {
      const x = i * step
      const y = height - ((p - min) / range) * (height - 8) - 4
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const areaPath = `${path} L${width},${height} L0,${height} Z`
  const gradId = `chartGrad_${color.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
