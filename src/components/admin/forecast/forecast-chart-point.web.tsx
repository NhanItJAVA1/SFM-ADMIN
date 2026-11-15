import type { ForecastChartPointProps } from './forecast-chart-point';

/** Native DOM events avoid react-native-svg's unsupported web responder props. */
export function ForecastChartPoint({ cx, cy, fill, opacity, label, onSelect }: ForecastChartPointProps) {
  return <circle cx={cx} cy={cy} r={4} fill={fill} fillOpacity={opacity}
    role="button" tabIndex={0} aria-label={label} style={{ cursor: 'pointer' }}
    onClick={onSelect} onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
      }
    }}><title>{label}</title></circle>;
}
