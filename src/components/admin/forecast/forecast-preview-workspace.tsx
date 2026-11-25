import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { adminApi, type AdminUser } from '@/api/adminApi';
import { aiApi, type ForecastDays, type ForecastLookbackDays, type RawForecastResponse } from '@/api/aiApi';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Search, SlidersHorizontal, TrendingUp, Users, Wallet } from 'lucide-react-native';

import { useAdminTheme } from '../admin-design';
import { createForecastStyles } from './forecast-preview-styles';
import { ForecastHistoryChart } from './forecast-history-chart';
import { readForecastPreviewResponse } from './forecast-preview-response';

const USERS_PER_PAGE = 5;
const FORECAST_ROWS_PER_PAGE = 5;
const money = (amount: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount) + ' đ';
const shortDate = (value: string) => value.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const vietnamToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() + 7 * 3600000 - 86400000).toISOString().slice(0, 10);
function errorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || (error instanceof Error ? error.message : 'Không tải được dự báo. Vui lòng thử lại.');
}
const fallbackReasons: Record<string, string> = {
  insufficient_history: 'Lịch sử chi tiêu chưa đủ cho cấu hình đã chọn.',
  insufficient_income_history: 'Chưa đủ lịch sử thu nhập để chạy mô hình.',
  model_not_available: 'Mô hình hiện chưa sẵn sàng.',
  prediction_failed: 'Mô hình chưa xử lý được cửa sổ này.',
};

export function ForecastPreviewWorkspace() {
  const theme = useAdminTheme();
  const { width, height } = useWindowDimensions();
  const wide = width >= 1180;
  const sideBySide = width >= 1320;
  const compact = height < 900 || width < 1480;
  const sectionGap = compact ? 16 : 22;
  const chartHeight = compact ? Math.max(160, Math.min(210, height - 560)) : Math.max(220, Math.min(360, height - 720));
  const rowHeight = compact ? 36 : Math.max(42, Math.floor((chartHeight - 28) / 5));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [asOf, setAsOf] = useState(yesterday);
  const [lookback, setLookback] = useState<ForecastLookbackDays>(14);
  const [horizon, setHorizon] = useState<ForecastDays>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RawForecastResponse | null>(null);
  const [forecastPage, setForecastPage] = useState(1);
  const request = useRef<AbortController | null>(null);
  const styles = createForecastStyles(theme, compact, wide, rowHeight);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingUsers(true); setUserError('');
      adminApi.listUsers({ role: 'User', status: 'Active', search, page, pageSize: USERS_PER_PAGE }, controller.signal)
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          const totalCount = Array.isArray(data) ? data.length : data.totalCount;
          const lastPage = Math.max(1, Math.ceil(totalCount / USERS_PER_PAGE));
          if (page > lastPage) { setPage(lastPage); return; }
          setUsers(Array.isArray(data) ? data.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE) : data.items.slice(0, USERS_PER_PAGE));
          setTotal(totalCount);
        })
        .catch(e => { if (!controller.signal.aborted) { setUsers([]); setUserError(errorMessage(e)); } })
        .finally(() => { if (!controller.signal.aborted) setLoadingUsers(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page]);
  useEffect(() => () => request.current?.abort(), []);

  function clearResult() { setResult(null); setError(''); setForecastPage(1); }
  const parsedDate = new Date(`${asOf}T00:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(asOf) && !asOf.startsWith('0000')
    && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === asOf && asOf < vietnamToday();
  async function preview() {
    if (!selectedUser || !validDate || busy) return;
    const controller = new AbortController(); request.current = controller;
    clearResult(); setBusy(true);
    try {
      const payload = { userId: selectedUser.id, asOf, lookbackDays: lookback, forecastDays: horizon };
      const response = await aiApi.previewForecast(payload, controller.signal);
      if (!controller.signal.aborted) setResult(readForecastPreviewResponse(response.data, payload));
    } catch (e) { if (!controller.signal.aborted) setError(errorMessage(e)); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const forecast = result?.forecast;
  const daily = forecast?.dailyForecasts ?? [];
  const forecastPages = Math.max(1, Math.ceil(daily.length / FORECAST_ROWS_PER_PAGE));
  const forecastOffset = (forecastPage - 1) * FORECAST_ROWS_PER_PAGE;
  const visibleDays = daily.slice(forecastOffset, forecastOffset + FORECAST_ROWS_PER_PAGE);
  const userPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  function pager(current: number, pages: number, onPage: (page: number) => void, label: string, disabled = false) {
    return <View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: trang trước`} disabled={current <= 1 || disabled}
        onPress={() => onPage(current - 1)} style={[styles.pageButton, (current <= 1 || disabled) && { opacity: 0.35 }]}><ChevronLeft size={15} color={theme.textMuted} /></Pressable>
      <Text style={styles.text}>Trang {current}/{pages}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: trang sau`} disabled={current >= pages || disabled}
        onPress={() => onPage(current + 1)} style={[styles.pageButton, (current >= pages || disabled) && { opacity: 0.35 }]}><ChevronRight size={15} color={theme.textMuted} /></Pressable>
    </View>;
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.workspace}>
      <View style={styles.pageHeader}>
        <View style={styles.pageIcon}><TrendingUp size={compact ? 21 : 25} strokeWidth={1.7} color={theme.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dự báo chi tiêu</Text>
          <Text style={styles.subtitle}>Khám phá xu hướng chi tiêu từ lịch sử đến những ngày sắp tới.</Text>
        </View>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start', gap: sectionGap }}>
        <View style={[styles.card, { width: wide ? compact ? 264 : 300 : '100%' }]}>
          <View style={{ gap: 5 }}>
            <View style={styles.sectionHeading}>
              <View style={styles.row}><Users size={17} color={theme.textMuted} /><Text style={styles.heading}>Người dùng</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>{total} hồ sơ</Text></View>
            </View>
            {!compact ? <Text style={styles.text}>Chọn hồ sơ bạn muốn xem dự báo.</Text> : null}
          </View>
          <View style={styles.search}>
            <Search size={15} color={theme.textMuted} />
            <TextInput accessibilityLabel="Tìm người dùng" placeholder="Tìm tên hoặc email" placeholderTextColor={theme.textMuted} style={styles.searchInput}
              value={search} editable={!busy} onChangeText={value => { setSearch(value); setPage(1); setLoadingUsers(true); }} />
          </View>
          <View style={{ height: USERS_PER_PAGE * (compact ? 50 : 62) + (USERS_PER_PAGE - 1) * (compact ? 8 : 10), gap: compact ? 8 : 10 }}>
            {loadingUsers ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View> : userError ? <Text style={styles.error}>{userError}</Text> : users.length === 0 ? <Text style={styles.text}>Không tìm thấy người dùng phù hợp.</Text> : users.map(user => {
              const selected = selectedUser?.id === user.id;
              return <Pressable key={user.id} disabled={busy} accessibilityRole="button" accessibilityState={{ selected }}
                style={({ hovered }) => [styles.user, hovered && !selected && styles.hover, selected && styles.userSelected]} onPress={() => { setSelectedUser(user); clearResult(); }}>
                <View style={[styles.avatar, selected && styles.avatarSelected]}><Text style={[styles.avatarText, selected && { color: theme.textInverse }]}>{(user.displayName || user.username).trim().slice(0, 1).toLocaleUpperCase('vi-VN')}</Text></View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={compact ? 1 : 2} style={styles.userName}>{user.displayName || user.username}</Text>
                  <Text numberOfLines={1} style={styles.userEmail}>{user.email}</Text>
                </View>
                {selected ? <Check size={15} strokeWidth={2} color={theme.primary} /> : <Text style={styles.badgeText}>#{user.id}</Text>}
              </Pressable>;
            })}
          </View>
          {pager(page, userPages, value => { setPage(value); setLoadingUsers(true); }, 'Người dùng', busy || loadingUsers)}
          <View style={styles.selectedUser}>
            <Text style={styles.text}>Hồ sơ đang chọn</Text>
            <Text numberOfLines={1} style={[styles.label, { color: selectedUser ? theme.primary : theme.textMuted }]}>{selectedUser ? (selectedUser.displayName || selectedUser.username) + ' · #' + selectedUser.id : 'Chưa chọn người dùng'}</Text>
          </View>
        </View>

        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0, gap: sectionGap }}>
          <View style={styles.card}>
            <View style={styles.sectionHeading}>
              <View style={styles.row}><SlidersHorizontal size={17} color={theme.textMuted} /><Text style={styles.heading}>Thiết lập dự báo</Text></View>
              {!compact && wide ? <Text style={styles.text}>Chọn khoảng thời gian cần xem</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: compact ? 14 : 20 }}>
              <View style={{ gap: 8, width: compact ? 135 : 156 }}>
                <View style={styles.row}><CalendarDays size={13} color={theme.textMuted} /><Text style={styles.fieldLabel}>Ngày chốt</Text></View>
                <TextInput accessibilityLabel="Ngày chốt" placeholder="YYYY-MM-DD" placeholderTextColor={theme.textMuted} value={asOf} editable={!busy} onChangeText={value => { setAsOf(value); clearResult(); }} style={styles.input} />
              </View>
              <View style={{ gap: 8, flexGrow: 1, minWidth: compact ? 190 : 214 }}>
                <Text style={styles.fieldLabel}>Lịch sử chi tiêu</Text>
                <View style={styles.segment}>{([14, 30, 90] as const).map(value => <Pressable key={value} disabled={busy} accessibilityRole="button" accessibilityLabel={'Lịch sử ' + value + ' ngày'} accessibilityState={{ selected: value === lookback }}
                  onPress={() => { setLookback(value); clearResult(); }} style={({ hovered }) => [styles.chip, hovered && value !== lookback && styles.hover, value === lookback && styles.chipSelected]}>
                  <Text numberOfLines={1} style={[styles.chipLabel, value === lookback && styles.chipLabelSelected]}>{value} ngày</Text>
                </Pressable>)}</View>
              </View>
              <View style={{ gap: 8, flexGrow: 1, minWidth: compact ? 190 : 214 }}>
                <Text style={styles.fieldLabel}>Kỳ dự báo</Text>
                <View style={styles.segment}>{([7, 14, 30] as const).map(value => <Pressable key={value} disabled={busy} accessibilityRole="button" accessibilityLabel={'Dự báo ' + value + ' ngày'} accessibilityState={{ selected: value === horizon }}
                  onPress={() => { setHorizon(value); clearResult(); }} style={({ hovered }) => [styles.chip, hovered && value !== horizon && styles.hover, value === horizon && styles.chipSelected]}>
                  <Text numberOfLines={1} style={[styles.chipLabel, value === horizon && styles.chipLabelSelected]}>{value} ngày</Text>
                </Pressable>)}</View>
              </View>
              <Pressable accessibilityRole="button" disabled={!selectedUser || !validDate || busy} onPress={() => void preview()} style={({ hovered }) => [styles.button, hovered && !busy && { opacity: 0.9 }, (!selectedUser || !validDate || busy) && { opacity: 0.5 }]}>
                {busy ? <ActivityIndicator color={theme.textInverse} /> : <><TrendingUp size={15} color={theme.textInverse} /><Text style={styles.buttonText}>Xem dự báo</Text></>}
              </Pressable>
            </View>
            {!validDate ? <Text style={styles.error}>Ngày chốt theo định dạng YYYY-MM-DD, trước hôm nay theo giờ Việt Nam.</Text> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </View>

          {!forecast || !result ? <View style={[styles.card, styles.empty]}>
            <View style={styles.emptyIcon}><TrendingUp size={27} strokeWidth={1.5} color={theme.primary} /></View>
            <Text style={styles.heading}>{busy ? 'Đang phân tích lịch sử chi tiêu' : 'Bắt đầu từ một hồ sơ'}</Text>
            <Text style={[styles.text, { textAlign: 'center', maxWidth: 360 }]}>{busy ? 'Kết quả dự báo sẽ xuất hiện sau khi xử lý xong.' : 'Chọn người dùng và cửa sổ thời gian để xem lịch sử cùng dự báo chi tiêu.'}</Text>
          </View> : <>
            <View style={{ flexDirection: width < 650 ? 'column' : 'row', gap: compact ? 12 : 16 }}>
              <View style={[styles.summaryCard, styles.summaryPrimary, width < 650 && { flex: undefined, width: '100%' }]}>
                <View style={styles.row}><Wallet size={14} color={theme.primary} /><Text style={styles.metricLabel}>Tổng chi dự kiến</Text></View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metric, styles.metricPrimary]}>{money(forecast.predictedTotalExpense)}</Text>
                {!compact ? <Text style={styles.text}>Trong {forecast.forecastHorizonDays} ngày tiếp theo</Text> : null}
              </View>
              <View style={[styles.summaryCard, width < 650 && { flex: undefined, width: '100%' }]}>
                <View style={styles.row}><TrendingUp size={14} color={theme.textMuted} /><Text style={styles.metricLabel}>Bình quân mỗi ngày</Text></View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metric, styles.metricSmall]}>{money(forecast.predictedTotalExpense / daily.length)}</Text>
                {!compact ? <Text style={styles.text}>Tính trên kỳ dự báo đã chọn</Text> : null}
              </View>
              <View style={[styles.summaryCard, width < 650 && { flex: undefined, width: '100%' }]}>
                <View style={styles.row}><CalendarDays size={14} color={theme.textMuted} /><Text style={styles.metricLabel}>Khoảng dự báo</Text></View>
                <Text style={[styles.metric, styles.metricSmall]}>{forecast.forecastHorizonDays} <Text style={{ fontSize: compact ? 13 : 15, fontWeight: '400', color: theme.textMuted }}>ngày</Text></Text>
                <Text style={styles.text}>{shortDate(forecast.forecastStartDate)} – {shortDate(forecast.forecastEndDate)}</Text>
              </View>
            </View>
            {forecast.status !== 'ok' ? <View style={styles.notice}><Text style={styles.text}>{fallbackReasons[forecast.status] || 'Dữ liệu chưa đủ điều kiện chạy mô hình.'} Kết quả dùng {forecast.model === 'MeanAvailableHistory' ? 'lịch sử hiện có' : 'trung bình ' + forecast.lookbackDays + ' ngày đã chọn'}.</Text></View> : null}
            <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: sectionGap, alignItems: 'stretch' }}>
              <View style={[styles.card, { flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%' }]}>
                <View style={styles.sectionHeading}>
                  <View style={{ gap: 5 }}><Text style={styles.heading}>Diễn biến chi tiêu</Text>{!compact ? <Text style={styles.text}>Lịch sử và dự báo theo từng ngày · VND</Text> : null}</View>
                  <View style={[styles.badge, { backgroundColor: theme.primaryPressed }]}><Text style={[styles.badgeText, { color: theme.primary }]}>{forecast.status === 'ok' ? 'GBM' : 'Ước lượng'}</Text></View>
                </View>
                <ForecastHistoryChart result={result} height={chartHeight} />
              </View>
              <View style={[styles.card, { width: sideBySide ? compact ? 262 : 300 : '100%' }]}>
                <View style={{ gap: 5 }}><Text style={styles.heading}>Chi tiết dự báo</Text><Text style={styles.text}>{forecastOffset + 1}–{forecastOffset + visibleDays.length} trong {daily.length} ngày</Text></View>
                <View style={styles.table}>
                  <View style={styles.tableHeader}><Text style={styles.fieldLabel}>Ngày</Text><Text style={styles.fieldLabel}>Chi tiêu dự kiến</Text></View>
                  {Array.from({ length: FORECAST_ROWS_PER_PAGE }, (_, index) => {
                    const item = visibleDays[index];
                    return <View key={item?.date ?? 'empty-' + index} style={[styles.tableRow, index % 2 === 1 && { backgroundColor: theme.screen }]}>
                      <Text style={styles.tableDate}>{item ? item.date.split('-').reverse().join('/') : '—'}</Text>
                      <Text style={styles.tableAmount}>{item ? money(item.predictedExpense) : '—'}</Text>
                    </View>;
                  })}
                </View>
                <View style={{ marginTop: 'auto' }}>{pager(forecastPage, forecastPages, setForecastPage, 'Dự báo')}</View>
              </View>
            </View>
          </>}
        </View>
      </View>
    </View>
  </ScrollView>;
}
