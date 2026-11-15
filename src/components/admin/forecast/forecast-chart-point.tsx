import { Circle } from 'react-native-svg';

export type ForecastChartPointProps = {
  cx: number;
  cy: number;
  fill: string;
  opacity: number;
  label: string;
  onSelect: () => void;
};

export function ForecastChartPoint({ cx, cy, fill, opacity, label, onSelect }: ForecastChartPointProps) {
  return <Circle cx={cx} cy={cy} r={4} fill={fill} fillOpacity={opacity} onPress={onSelect} accessibilityLabel={label} />;
}
