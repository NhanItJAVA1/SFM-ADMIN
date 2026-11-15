import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import type { RawForecastResponse } from '@/api/aiApi';
import { adminStyleSheet, useAdminTheme } from '../admin-design';
import { ForecastChartPoint } from './forecast-chart-point';

const DAY = 86400000;
const timestamp = (date: string) => Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
const shortDate = (date: string) => date.slice(5, 10).split('-').reverse().join('/');
const money = (amount: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount) + ' đ';
const axisMoney = (amount: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount >= 1000000 ? amount / 1000000 : amount >= 1000 ? amount / 1000 : amount)
  + (amount >= 1000000 ? ' tr' : amount >= 1000 ? 'k' : '');

export function ForecastHistoryChart({ result, height = 230 }: { result: RawForecastResponse; height?: number }) {
  const theme = useAdminTheme();
  const { forecast } = result;
  const history = result.history ?? [];
  const [selected, setSelected] = useState<{ date: string; amount: number; actual: boolean } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const futureLabel = forecast.status === 'ok' ? 'Dự báo' : 'Ước lượng';
  const past = history.map(item => ({ date: item.date, amount: item.expense, actual: true }));
  const future = forecast.dailyForecasts.map(item => ({ date: item.date, amount: item.predictedExpense, actual: false }));
  const start = timestamp(forecast.asOf) - (forecast.lookbackDays - 1) * DAY;
  const end = timestamp(forecast.forecastEndDate);
  const peak = Math.max(1, ...past.map(item => item.amount), ...future.map(item => item.amount)) * 1.08;
  const magnitude = 10 ** Math.floor(Math.log10(peak / 4));
  const normalizedStep = peak / 4 / magnitude;
  const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 2.5 ? 2.5 : normalizedStep <= 5 ? 5 : 10) * magnitude;
  const max = Math.ceil(peak / step) * step;
  const gridValues = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const top = 30;
  const bottom = height - 32;
  const right = canvasWidth - 28;
  const span = Math.max(right - 58, 1);
  const x = (date: string) => 58 + (timestamp(date) - start) / Math.max(end - start, DAY) * span;
  const y = (amount: number) => bottom - amount / max * (bottom - top);
  const cutoff = x(forecast.asOf) + span / (forecast.lookbackDays + forecast.forecastHorizonDays - 1) / 2;
  // The dashed segment starts at the final observed day; only future dates are predictions.
  const forecastLine = [...past.slice(-1), ...future];
  const ticks = Array.from({ length: 6 }, (_, i) => new Date(start + Math.round((end - start) / DAY * i / 5) * DAY).toISOString().slice(0, 10));
  const highlighted = selected ?? past[past.length - 1];
  const styles = adminStyleSheet({
    label: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 6, alignItems: 'center' },
    key: { flexDirection: 'row', gap: 7, alignItems: 'center' },
    detail: { fontSize: 12, color: theme.text, lineHeight: 20, fontWeight: '500' },
    detailRow: { borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: theme.cardAlt, flexDirection: 'row', alignItems: 'center', gap: 8 },
  });

  return <View style={{ gap: 12, minWidth: 0 }}>
    <View style={styles.legend}>
      <View style={styles.key}><View style={{ width: 14, height: 3, backgroundColor: theme.textMuted }} /><Text style={styles.label}>Thực tế · {history.length}/{forecast.lookbackDays} ngày</Text></View>
      <View style={styles.key}><View style={{ width: 14, borderTopWidth: 2, borderStyle: 'dashed', borderColor: theme.primary }} /><Text style={styles.label}>{futureLabel} · {forecast.forecastHorizonDays} ngày</Text></View>
    </View>
    <View style={{ height, width: '100%' }} onLayout={({ nativeEvent }) => {
      // Keep one SVG unit per pixel so larger charts don't inflate the labels.
      const nextWidth = nativeEvent.layout.width;
      if (nextWidth > 0 && Math.abs(nextWidth - canvasWidth) > 1) setCanvasWidth(nextWidth);
    }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${height}`} accessibilityLabel={`Chi tiêu thực tế ${forecast.lookbackDays} ngày và ${futureLabel.toLowerCase()} ${forecast.forecastHorizonDays} ngày`}>
        <Rect x={cutoff} y={top} width={Math.max(right - cutoff, 0)} height={bottom - top} fill={theme.primary} fillOpacity={0.05} />
        {gridValues.map(amount => <Grid key={amount} right={right} amount={amount} max={max} top={top} bottom={bottom} color={theme.border} textColor={theme.textMuted} />)}
        <Line x1={cutoff} x2={cutoff} y1={top - 3} y2={bottom} stroke={theme.textMuted} strokeDasharray="3 5" />
        <SvgText x={Math.min(cutoff, right - 38)} y={15} textAnchor="middle" fontSize={11} fill={theme.textMuted}>Chốt {shortDate(forecast.asOf)}</SvgText>
        <Polyline points={past.map(item => `${x(item.date)},${y(item.amount)}`).join(' ')} fill="none" stroke={theme.textMuted} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={forecastLine.map(item => `${x(item.date)},${y(item.amount)}`).join(' ')} fill="none" stroke={theme.primary} strokeWidth={2.5} strokeDasharray="5 5" strokeLinejoin="round" strokeLinecap="round" />
        {[...past, ...future].map(item => <ForecastChartPoint key={item.date} cx={x(item.date)} cy={y(item.amount)}
          fill={item.actual ? theme.textMuted : theme.primary} opacity={highlighted?.date === item.date ? 1 : 0.3}
          onSelect={() => setSelected(item)} label={`${item.date}: ${money(item.amount)}`} />)}
        {highlighted ? <Circle cx={x(highlighted.date)} cy={y(highlighted.amount)} r={5} stroke={theme.card} strokeWidth={2} fill={highlighted.actual ? theme.textMuted : theme.primary} /> : null}
        {ticks.map(date => <SvgText key={date} x={x(date)} y={height - 8} textAnchor="middle" fontSize={11} fill={theme.textMuted}>{shortDate(date)}</SvgText>)}
      </Svg>
    </View>
    <View style={styles.detailRow}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: highlighted?.actual ? theme.textMuted : theme.primary }} />
      <Text numberOfLines={1} style={styles.detail}>{highlighted ? `${highlighted.actual ? 'Thực tế' : futureLabel} ${shortDate(highlighted.date)} · ${money(highlighted.amount)}` : 'Chọn một điểm trên biểu đồ để xem số tiền.'}</Text>
    </View>
    {history.length === 0 ? <Text style={styles.label}>Kết quả chưa có dữ liệu lịch sử để đối chiếu.</Text> : history.length < forecast.lookbackDays ? <Text style={styles.label}>Phần trước khi bắt đầu sổ giao dịch được để trống.</Text> : null}
  </View>;
}

function Grid({ amount, max, right, top, bottom, color, textColor }: { amount: number; max: number; right: number; top: number; bottom: number; color: string; textColor: string }) {
  const y = bottom - amount / max * (bottom - top);
  return <><Line x1={58} x2={right} y1={y} y2={y} stroke={color} strokeDasharray="4 4" />
    <SvgText x={50} y={y + 4} textAnchor="end" fontSize={11} fill={textColor}>{axisMoney(amount)}</SvgText></>;
}
