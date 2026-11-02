import { Activity, CircleAlert, RotateCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import type { MonitoringRange, MonitoringPoint } from '@/api/adminApi';
import { useAdminMonitoringDashboard } from '@/hooks/use-admin-monitoring-dashboard';
import { adminStyleSheet, useAdminTheme } from './admin-design';
import { formatMonitoringMetric, formatMonitoringTime } from './monitoring-helpers';

const ranges: MonitoringRange[] = ['1h', '6h', '24h', '7d'];
const supported = ['1h', '6h', '24h'];
export function SystemMonitoringWorkspace() {
  const theme = useAdminTheme();
  const width = useWindowDimensions().width;
  const styles = createStyles(theme, width >= 1100);
  const [range, setRange] = useState<MonitoringRange>('1h');
  const { data, loading, refreshing, error, status, refresh } = useAdminMonitoringDashboard(range);
  const metrics = [
    ['Requests per minute', data?.overview.requestsPerMinute, 'req/min'],
    ['Total requests', data?.requests.totalRequests, 'requests'],
    ['HTTP 5xx error rate', data?.overview.http5xxErrorRatePercent, '%'],
    ['P95 response time', data?.overview.p95LatencyMilliseconds, 'ms'],
  ] as const;
  const points = data?.requests.requestsPerMinute ?? [];
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text accessibilityRole="header" style={styles.title}>Giám sát API</Text><Text style={styles.muted}>Dữ liệu làm mới mỗi 20 giây · Các chỉ số tổng quan dùng cửa sổ 5 phút</Text></View>
      <Pressable accessibilityRole="button" onPress={refresh} disabled={refreshing} style={styles.button}>{refreshing ? <ActivityIndicator size="small" color={theme.primary}/> : <RotateCw size={15} color={theme.primary}/>}<Text style={styles.buttonText}>Làm mới</Text></Pressable></View>
    <View accessibilityRole="radiogroup" accessibilityLabel="Khoảng thời gian" style={styles.ranges}>{ranges.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: range === value, disabled: !supported.includes(value) }} disabled={!supported.includes(value)} onPress={() => setRange(value)} style={[styles.range, range === value && styles.selected, !supported.includes(value) && styles.disabled]}><Text style={[styles.rangeText, range === value && styles.selectedText]}>{value}{value === '7d' ? ' · chưa hỗ trợ' : ''}</Text></Pressable>)}</View>
    {error ? <View accessibilityRole="alert" style={styles.notice}><CircleAlert size={17} color={theme.dangerText}/><Text style={styles.noticeText}>{status === 401 || status === 403 ? 'Bạn không có quyền xem dữ liệu giám sát. Hãy đăng nhập bằng tài khoản quản trị.' : error}</Text><Pressable onPress={refresh}><Text style={styles.buttonText}>Thử lại</Text></Pressable></View> : null}
    {!loading && data && metrics.every(([, value]) => value == null) ? <View style={styles.notice}><Activity size={17} color={theme.textMuted}/><Text style={styles.noticeText}>Chưa có số liệu trong khoảng thời gian này. Các chỉ số chưa được backend cung cấp sẽ hiển thị N/A.</Text></View> : null}
    <View style={styles.kpis}>{metrics.map(([label, value, unit]) => <View key={label} style={styles.card}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{loading ? '…' : formatMonitoringMetric(value, unit as 'req/s' | 'ms' | '%')}</Text></View>)}</View>
    <View style={styles.card}><Text accessibilityRole="header" style={styles.sectionTitle}>Request traffic over time</Text><Text style={styles.muted}>Requests per minute · {range} · refreshed every 20 seconds</Text>
      {loading ? <View style={styles.chartEmpty}><ActivityIndicator color={theme.primary}/></View> : points.length ? <TrafficChart points={points} color={theme.primary} border={theme.border} muted={theme.textMuted}/> : <View style={styles.chartEmpty}><Text style={styles.muted}>{error ? 'Không có dữ liệu biểu đồ.' : 'Chưa có dữ liệu biểu đồ trong khoảng thời gian đã chọn.'}</Text></View>}
    </View>
    <View style={styles.card}><Text accessibilityRole="header" style={styles.sectionTitle}>Top requested endpoints</Text>
      {!data ? <Text style={styles.muted}>{loading ? 'Đang tải…' : 'Dữ liệu endpoint hiện không khả dụng.'}</Text> : !data.endpoints.routeLabelsAvailable ? <Text style={styles.muted}>Backend chưa cung cấp nhãn route trong metrics; danh sách endpoint hiện không khả dụng.</Text> : !data.endpoints.endpoints.length ? <Text style={styles.muted}>Không có request trong khoảng thời gian này.</Text> : <View>{data.endpoints.endpoints.map((endpoint, index) => <View key={`${endpoint.method}-${endpoint.route}-${index}`} style={styles.endpoint}><Text style={styles.method}>{endpoint.method ?? '—'}</Text><Text numberOfLines={1} style={styles.route}>{endpoint.route}</Text><Text style={styles.count}>{endpoint.totalRequests == null ? 'N/A' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(endpoint.totalRequests)}</Text></View>)}</View>}
    </View>
    {data?.overview.observedAtUtc ? <Text style={styles.muted}>Lần quan sát gần nhất: {formatMonitoringTime(data.overview.observedAtUtc)}</Text> : null}
  </ScrollView>;
}

function TrafficChart({ points, color, border, muted }: { points: MonitoringPoint[]; color: string; border: string; muted: string }) {
  const width = Math.max(320, useWindowDimensions().width - 100);
  const valid = points.filter(point => point.value != null && Number.isFinite(Date.parse(point.timestampUtc)));
  if (!valid.length) return <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: muted }}>Нет доступных значений.</Text></View>;
  const left = 42, right = width - 12, top = 16, bottom = 180;
  const min = Date.parse(valid[0].timestampUtc), maxTime = Date.parse(valid[valid.length - 1].timestampUtc);
  const maxVal = Math.max(...valid.map(point => point.value as number), 1) * 1.1;
  const coord = valid.map(point => ({ x: left + (Date.parse(point.timestampUtc) - min) / Math.max(maxTime - min, 1) * (right - left), y: bottom - (point.value as number) / maxVal * (bottom - top) }));
  const path = coord.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return <View style={{ overflow: 'hidden', marginTop: 12 }}><Svg width={width} height={218} accessibilityRole="image" accessibilityLabel="Request traffic over time">
    {[0, .5, 1].map(r => <Line key={r} x1={left} x2={right} y1={bottom - r * (bottom - top)} y2={bottom - r * (bottom - top)} stroke={border} strokeDasharray={r ? '3 4' : undefined}/>) }
    {[0, .5, 1].map(r => <SvgText key={r} x={left - 7} y={bottom - r * (bottom - top) + 4} textAnchor="end" fontSize={10} fill={muted}>{(maxVal * r).toFixed(r ? 1 : 0)}</SvgText>)}
    <Path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    {[0, 1].map(i => <SvgText key={i} x={i ? right : left} y={202} textAnchor={i ? 'end' : 'start'} fontSize={10} fill={muted}>{new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(i ? maxTime : min))}</SvgText>)}
  </Svg></View>;
}

function createStyles(theme: ReturnType<typeof useAdminTheme>, desktop: boolean) {
  return adminStyleSheet({ root: { flex: 1, backgroundColor: theme.screen }, content: { alignSelf: 'center', width: '100%', maxWidth: 1360, padding: desktop ? 36 : 18, paddingBottom: 48, gap: 20 }, header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, title: { fontSize: 23, fontWeight: '600', color: theme.text, marginBottom: 5 }, muted: { fontSize: 12, color: theme.textMuted, lineHeight: 19 }, button: { minHeight: 38, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 5, paddingHorizontal: 12 }, buttonText: { color: theme.primary, fontSize: 12, fontWeight: '500' }, ranges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, range: { borderWidth: 1, borderColor: theme.border, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 8 }, rangeText: { fontSize: 12, color: theme.textMuted }, selected: { backgroundColor: theme.primaryPressed, borderColor: theme.primary }, selectedText: { color: theme.primary, fontWeight: '600' }, disabled: { opacity: .55 }, kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 6, padding: 18, gap: 12 }, label: { color: theme.textMuted, fontSize: 12 }, value: { color: theme.text, fontSize: 25, fontWeight: '600', fontVariant: ['tabular-nums'] }, sectionTitle: { color: theme.text, fontWeight: '600', fontSize: 14 }, chartEmpty: { height: 218, alignItems: 'center', justifyContent: 'center' }, notice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 5 }, noticeText: { flex: 1, minWidth: 180, color: theme.textMuted, fontSize: 12, lineHeight: 18 }, endpoint: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: theme.border }, method: { width: 48, color: theme.primary, fontWeight: '600', fontSize: 11 }, route: { flex: 1, color: theme.text, fontSize: 12, fontFamily: 'monospace' }, count: { width: 90, textAlign: 'right', color: theme.text, fontVariant: ['tabular-nums'], fontSize: 12 } });
}
