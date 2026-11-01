import { ArrowDownToLine, Check, CircleDashed, Download, Pause, Play, Search, Terminal, X } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { AdminUser } from '@/api/adminApi';
import type { ForecastTrainingPayload } from '@/api/aiApi';
import { adminStyleSheet, useAdminTheme, type AdminTheme } from '../admin-design';
import { trainingLogLines, trainingLogSources, type TrainingLogEntry, type TrainingLogLine, type TrainingLogSource } from './training-log-data';

export type { TrainingLogEntry } from './training-log-data';

const stages = [
  { key: 'data', label: 'Lấy dữ liệu người dùng' },
  { key: 'training', label: 'Huấn luyện mô hình' },
  { key: 'complete', label: 'Hoàn tất' },
] as const;
const levels = { running: 'RUN', info: 'INFO', data: 'DATA', success: 'OK', warning: 'WARN', error: 'ERROR' };
const colors = { running: '#a8c6ff', info: '#9baec6', data: '#71d3d7', success: '#8ed5ac', warning: '#edc47e', error: '#ff9a9a' };
const mono = 'Consolas, "SFMono-Regular", Menlo, monospace';
const timeFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hour12: false });
const rowHeight = 28;
const viewportHeight = 476;
type Filter = 'all' | 'events' | 'data' | 'problems';

export function ForecastTrainingLog({ entries, running, payload, users }: {
  entries: TrainingLogEntry[]; running: boolean; payload: ForecastTrainingPayload | null; users: AdminUser[];
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [source, setSource] = useState('all');
  const [userId, setUserId] = useState('all');
  const [now, setNow] = useState(Date.now);
  const lastEntry = entries[entries.length - 1];
  const failed = lastEntry?.status === 'error';
  const allLines = useMemo(() => trainingLogLines(entries), [entries]);
  const counts = useMemo(() => ({
    all: allLines.length,
    events: allLines.filter(line => line.status !== 'data').length,
    data: allLines.filter(line => line.status === 'data').length,
    problems: allLines.filter(line => line.status === 'warning' || line.status === 'error').length,
  }), [allLines]);
  const lines = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return allLines.filter(line =>
      (filter === 'all' || (filter === 'events' && line.status !== 'data') || (filter === 'data' && line.status === 'data') || (filter === 'problems' && ['error', 'warning'].includes(line.status))) &&
      (source === 'all' || (line.source ?? 'system') === source) &&
      (userId === 'all' || String(line.userId) === userId) &&
      (!query || `${line.message} ${line.userId ?? ''} ${trainingLogSources[line.source ?? 'system']}`.toLocaleLowerCase('vi-VN').includes(query)),
    );
  }, [allLines, filter, search, source, userId]);
  const lineWidth = useMemo(() => Math.max(920, ...lines.map(line => 450 + line.message.length * 7.25)), [lines]);
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 8);
  const end = Math.min(lines.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 8);
  const userNames = new Map(users.map(user => [user.id, user.displayName || user.username]));
  const elapsed = entries.length ? Math.max(0, Math.floor(((running ? now : lastEntry.timestamp) - entries[0].timestamp) / 1000)) : 0;
  const duration = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const field: CSSProperties = { color: theme.text, background: theme.inputBackground, border: `1px solid ${theme.border}`, borderRadius: 6, minHeight: 36, fontFamily: 'AdminInter, sans-serif', fontSize: 11, padding: '7px 10px', boxSizing: 'border-box', minWidth: 0 };

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running]);

  useLayoutEffect(() => {
    if (!following || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setScrollTop(scrollRef.current.scrollTop);
  }, [following, lines.length]);

  function browse() {
    setFollowing(false);
    setScrollTop(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function download(kind: 'log' | 'json') {
    const body = kind === 'json' ? JSON.stringify(payload, null, 2) : allLines.map(line =>
      `${timeFormatter.format(line.timestamp)} ${levels[line.status].padEnd(5)} [${trainingLogSources[line.source ?? 'system']}${line.userId !== undefined ? ` #${line.userId}` : ''}] ${line.message}`,
    ).join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: kind === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `forecast-training-${payload?.users[0]?.asOf ?? 'session'}.${kind}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <View style={styles.panel}>
    <View style={styles.heading}>
      <View style={styles.headingIcon}><Terminal size={19} color={theme.primary} /></View>
      <View style={styles.grow}><Text style={styles.title}>Nhật ký huấn luyện</Text><Text style={styles.help}>Toàn bộ dữ liệu BE gửi AI và tiến trình của lần chạy hiện tại</Text></View>
      <View accessibilityLiveRegion="polite" style={styles.badge}>{running ? <ActivityIndicator size="small" color={theme.primary} /> : null}<Text style={[styles.badgeText, failed && styles.error]}>{running ? 'Đang xử lý' : failed ? 'Thất bại' : entries.length ? 'Đã hoàn tất' : 'Chờ bắt đầu'}</Text></View>
      <Text style={styles.duration}>{duration}</Text>
    </View>
    <View style={styles.stages}>{stages.map(stage => {
      const events = entries.filter(entry => entry.stage === stage.key);
      const error = events.some(entry => entry.status === 'error');
      const done = events.some(entry => entry.status === 'success');
      const busy = running && !done && events.some(entry => entry.status === 'running');
      const color = error ? theme.dangerText : done || busy ? theme.primary : theme.textMuted;
      return <View key={stage.key} style={styles.stage}><View style={styles.stageIcon}>{error ? <X size={15} color={color} /> : done ? <Check size={15} color={color} /> : busy ? <ActivityIndicator size="small" color={color} /> : <CircleDashed size={15} color={color} />}</View><View><Text style={[styles.stageLabel, { color }]}>{stage.label}</Text><Text style={styles.help}>{error ? 'Thất bại' : done ? 'Đã xong' : busy ? 'Đang xử lý' : 'Chờ thực hiện'}</Text></View></View>;
    })}</View>
    <View style={styles.toolbar}>
      <View style={styles.filters}>{([
        ['all', 'Tất cả'], ['events', 'Tiến trình'], ['data', 'Dữ liệu'], ['problems', 'Lỗi / Lưu ý'],
      ] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }} onPress={() => { browse(); setFilter(key); }} style={[styles.filter, filter === key && styles.selected]}><Text style={[styles.filterText, filter === key && styles.accent]}>{label} <Text style={styles.help}>{counts[key].toLocaleString('vi-VN')}</Text></Text></Pressable>)}</View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={!entries.length} onPress={() => download('log')} style={[styles.button, !entries.length && styles.disabled]}><Download size={13} color={theme.textMuted} /><Text style={styles.help}>Tải log</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={!payload} onPress={() => download('json')} style={[styles.button, !payload && styles.disabled]}><Download size={13} color={theme.textMuted} /><Text style={styles.help}>JSON đầy đủ</Text></Pressable>
      </View>
    </View>
    <View style={styles.searchControls}>
      <View style={styles.search}><Search size={14} color={theme.textMuted} /><input aria-label="Tìm trong nhật ký huấn luyện" placeholder="Tìm ID, số tiền, tài khoản hoặc nội dung…" value={search} onChange={event => { browse(); setSearch(event.currentTarget.value); }} style={{ ...field, border: 'none', flex: 1, background: 'transparent', outline: 'none' }} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm log" onPress={() => { browse(); setSearch(''); }}><X size={13} color={theme.textMuted} /></Pressable> : null}</View>
      <select aria-label="Lọc log theo người dùng" value={userId} onChange={event => { browse(); setUserId(event.currentTarget.value); }} style={{ ...field, flex: '1 1 190px', maxWidth: '100%' }}><option value="all">Tất cả người dùng</option>{payload?.users.map(user => <option key={user.userId} value={user.userId}>#{user.userId} · {userNames.get(user.userId) ?? 'Người dùng'}</option>)}</select>
      <select aria-label="Lọc loại dữ liệu log" value={source} onChange={event => { browse(); setSource(event.currentTarget.value); }} style={{ ...field, flex: '1 1 160px', maxWidth: '100%' }}><option value="all">Tất cả loại dữ liệu</option>{(Object.keys(trainingLogSources) as TrainingLogSource[]).map(key => <option key={key} value={key}>{({ system: 'Hệ thống', payload: 'Thông số payload', user: 'Người dùng', account: 'Tài khoản', transaction: 'Giao dịch', budget: 'Ngân sách', category: 'Danh mục' })[key]}</option>)}</select>
    </View>
    <div style={{ background: '#111820', color: '#d7e0ec', fontFamily: mono }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '11px 16px', background: '#19222d', borderBottom: '1px solid #2b3747' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 10, letterSpacing: 1.1 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: running ? '#8ed5ac' : failed ? '#ff9a9a' : '#718298' }} />TRAINING OUTPUT <span style={{ color: '#8394aa', letterSpacing: 0 }}>{running ? 'LIVE' : 'SESSION'}</span></span>
        <div style={{ display: 'flex', gap: 7 }}><button type="button" aria-pressed={following} onClick={() => setFollowing(value => !value)} style={consoleButton}>{following ? <Pause size={12} /> : <Play size={12} />}{following ? 'Tạm dừng cuộn' : 'Tiếp tục theo dõi'}</button><button type="button" aria-label="Cuộn đến dòng log mới nhất" onClick={() => setFollowing(true)} style={consoleButton}><ArrowDownToLine size={13} />Xuống cuối</button></div>
      </div>
      <div ref={scrollRef} role="region" aria-label="Nội dung log huấn luyện và toàn bộ dữ liệu BE gửi AI" tabIndex={0} onScroll={event => {
        const element = event.currentTarget;
        setScrollTop(element.scrollTop);
        if (element.scrollHeight - element.scrollTop - element.clientHeight > rowHeight * 2) setFollowing(false);
      }} style={{ height: viewportHeight, overflow: 'auto', overflowAnchor: 'none', scrollbarColor: '#415168 #111820', scrollbarWidth: 'thin', outlineOffset: -2 }}>
        {lines.length ? <div style={{ height: lines.length * rowHeight, width: lineWidth, minWidth: '100%', position: 'relative' }}>
          {lines.slice(start, end).map((line, index) => <ConsoleLine key={line.key} line={line} top={(start + index) * rowHeight} />)}
        </div> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#8f9eb2', fontSize: 12, padding: 24, boxSizing: 'border-box', textAlign: 'center' }}><Terminal size={20} />{entries.length ? 'Không có dòng log phù hợp với bộ lọc.' : 'Bắt đầu huấn luyện để theo dõi dữ liệu và tiến trình tại đây.'}</div>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, padding: '10px 16px', borderTop: '1px solid #2b3747', fontSize: 10, color: '#8f9eb2' }}><span>{lines.length.toLocaleString('vi-VN')} / {allLines.length.toLocaleString('vi-VN')} dòng · Giờ Việt Nam · Cuộn ngang để xem đủ trường dữ liệu</span><span style={{ color: following ? '#8ed5ac' : '#edc47e' }}>{following ? '● Tự động theo dõi dòng mới' : 'Ⅱ Đã tạm dừng cuộn · Dữ liệu vẫn được ghi'}</span></div>
    </div>
  </View>;
}

const consoleButton: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#202d3b', border: '1px solid #344357', color: '#bccbdc', borderRadius: 5, padding: '5px 8px', cursor: 'pointer', fontFamily: mono, fontSize: 10 };

function ConsoleLine({ line, top }: { line: TrainingLogLine; top: number }) {
  const source = line.source ?? 'system';
  return <div style={{ position: 'absolute', top, left: 0, width: '100%', height: rowHeight, display: 'grid', gridTemplateColumns: '48px 102px 58px 178px minmax(0, 1fr)', alignItems: 'center', fontSize: 12, lineHeight: `${rowHeight}px`, whiteSpace: 'pre', background: line.status === 'error' ? '#38242a' : source === 'user' && line.status === 'info' ? '#1d2e3b' : line.lineNumber % 2 ? 'transparent' : '#141d27', borderBottom: source === 'user' && line.status === 'info' ? '1px solid #304457' : undefined, boxSizing: 'border-box' }}>
    <span style={{ textAlign: 'right', paddingRight: 12, color: '#576a82', userSelect: 'none', fontSize: 10 }}>{line.lineNumber}</span>
    <span style={{ color: '#8294aa', fontSize: 11 }}>{timeFormatter.format(line.timestamp)}</span>
    <span style={{ color: colors[line.status], fontSize: 10 }}>{levels[line.status]}</span>
    <span style={{ color: source === 'system' ? '#8294aa' : '#88bdf1', fontSize: 10 }}>{trainingLogSources[source]}{line.userId !== undefined ? ` #${line.userId}` : ''}</span>
    <span style={{ color: line.status === 'data' ? '#c6d2e1' : colors[line.status], paddingRight: 20 }}>{line.status === 'data' ? <JsonTokens text={line.message} /> : line.message}</span>
  </div>;
}

function JsonTokens({ text }: { text: string }) {
  const tokens = [];
  const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    if (index > cursor) tokens.push(text.slice(cursor, index));
    const color = match[2] ? '#8fbce6' : match[1] ? '#9ed7b5' : match[3] ? '#e4c28b' : match[4] === 'null' ? '#7e91aa' : '#c2adf0';
    tokens.push(<span key={index} style={{ color }}>{match[0]}</span>);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) tokens.push(text.slice(cursor));
  return <>{tokens}</>;
}

function createStyles(theme: AdminTheme) {
  return adminStyleSheet({
    panel: { marginTop: 24, minWidth: 0, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 10, overflow: 'hidden' },
    heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 18 },
    headingIcon: { width: 37, height: 37, borderRadius: 9, backgroundColor: theme.primaryPressed, alignItems: 'center', justifyContent: 'center' },
    grow: { flex: 1, minWidth: 180 },
    title: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 22 },
    help: { fontSize: 11, color: theme.textMuted, lineHeight: 18 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: theme.cardAlt },
    badgeText: { fontSize: 11, fontWeight: '500', color: theme.primary },
    duration: { fontSize: 12, color: theme.textMuted, fontVariant: ['tabular-nums'] },
    stages: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, padding: 18, backgroundColor: theme.cardAlt, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border },
    stage: { flexDirection: 'row', alignItems: 'center', gap: 9, flexGrow: 1, minWidth: 185 },
    stageIcon: { width: 20, alignItems: 'center' },
    stageLabel: { fontSize: 12, fontWeight: '500', lineHeight: 20 },
    toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14, paddingBottom: 8 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    filter: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6 },
    filterText: { fontSize: 11, lineHeight: 18, color: theme.textMuted },
    selected: { backgroundColor: theme.primaryPressed },
    accent: { color: theme.primary },
    actions: { flexDirection: 'row', gap: 8 },
    button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme.border, borderRadius: 6 },
    searchControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14, paddingTop: 4 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, flexGrow: 3, flexShrink: 1, flexBasis: 280, minWidth: 0, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.inputBackground },
    disabled: { opacity: 0.4 },
    error: { color: theme.dangerText },
  });
}
