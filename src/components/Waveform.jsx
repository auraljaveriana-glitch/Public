export default function Waveform({ width = 140, height = 20 }) {
  const points = [4, 8, 14, 7, 18, 10, 20, 6, 16, 9, 12, 5, 8, 11, 4]
  const step = width / (points.length - 1)
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - p}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} fill="none">
      <path d={path} stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
