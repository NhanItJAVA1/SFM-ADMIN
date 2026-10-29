import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ChartLine } from "lucide-react-native";

import { aiApi, type AnalysisPreview, type AnalysisPreviewDataset, type AnalysisPreviewTransaction } from "@/api/aiApi";
import { getRequestErrorMessage } from "@/components/admin/admin-page-shared";
import { adminStyleSheet, useAdminTheme, type AdminTheme } from "@/components/admin/admin-design";

const vnd = (value: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} đ`;
const dateLabel = (value: string) => value.slice(0, 10).split("-").reverse().join("/");
const categoryColors = ["#4386bc", "#439c86", "#a48aca", "#c59540"];

export function useAnomalyPreviewDataset(enabled: boolean) {
  const [data, setData] = useState<AnalysisPreviewDataset | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || data || error) return;
    const controller = new AbortController();
    void aiApi.analysisPreviewDataset(controller.signal).then(response => {
      if (controller.signal.aborted) return;
      const next = response.data;
      const rows = next.transactions;
      if (next.currency !== "VND" || !Array.isArray(rows) || !rows.length || next.sampleExpenseCount !== rows.length + 1 ||
        !next.target || ![...rows, next.target].every(row => Number.isFinite(row.amount) && row.amount >= 0 && typeof row.category === "string" && typeof row.date === "string" && Number.isFinite(Date.parse(row.date))) ||
        new Set([...rows, next.target].map(row => row.transactionId)).size !== next.sampleExpenseCount) {
        throw new Error("Dữ liệu mẫu không hợp lệ. Vui lòng tải lại.");
      }
      setData(next);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(getRequestErrorMessage(reason));
    });
    return () => controller.abort();
  }, [enabled, data, error]);

  return { data, error, loading: !data && !error, retry: () => setError("") };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : 0;
}

export function AnomalyPreviewDataset({ state, amount, preview }: {
  state: ReturnType<typeof useAnomalyPreviewDataset>; amount: number; preview: AnalysisPreview | null;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const { data, error, loading } = state;
  if (!data) return <View style={styles.panel}>
    <Text style={styles.title}>1. Quan sát dữ liệu mẫu</Text>
    {loading ? <View style={styles.inline}><ActivityIndicator size="small" color={theme.primary} /><Text style={styles.help}>Đang tải các khoản chi nền…</Text></View> : null}
    {error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={state.retry} style={styles.retry}><Text style={styles.link}>Tải lại dữ liệu mẫu</Text></Pressable></> : null}
  </View>;

  const amounts = data.transactions.map(row => row.amount);
  const baselineMedian = median(amounts);
  const categoryRows = data.transactions.filter(row => row.category === data.target.category);
  const categoryMedian = median(categoryRows.map(row => row.amount));
  const ratio = categoryMedian > 0 && Number.isFinite(amount) ? amount / categoryMedian : null;
  const flagged = new Set(preview?.anomaly.summary.assessments.filter(row => row.status === "anomaly").map(row => row.transactionId).filter((id): id is number => id !== null) ?? []);
  const stats = [
    ["Khoản nhỏ nhất", vnd(Math.min(...amounts))], ["Khoản lớn nhất", vnd(Math.max(...amounts))],
    ["Trung vị toàn bộ", vnd(baselineMedian)], [`Trung vị ${data.target.category.toLocaleLowerCase("vi-VN")}`, categoryRows.length ? vnd(categoryMedian) : "Chưa có dữ liệu"],
  ];

  return <View style={styles.workspace}>
    <View style={styles.panel}>
      <View style={styles.heading}><ChartLine size={18} color={theme.primary} /><Text style={styles.title}>1. Quan sát {data.transactions.length} khoản chi nền</Text><Text style={styles.badge}>Dữ liệu mô phỏng</Text></View>
      <Text style={styles.help}>{dateLabel(data.transactions[0].date)} – {dateLabel(data.transactions[data.transactions.length - 1].date)}. Biểu đồ chưa bao gồm khoản chi bạn sắp nhập.</Text>
      <View style={styles.patterns}>
        {[...new Set(data.transactions.map(row => row.category))].map(category => {
          const rows = data.transactions.filter(row => row.category === category);
          return <Text key={category} style={styles.pattern}>{category}: {rows.length} khoản · {getCadence(rows)} · {vnd(Math.min(...rows.map(row => row.amount)))} – {vnd(Math.max(...rows.map(row => row.amount)))}</Text>;
        })}
      </View>
      <View style={styles.stats}>{stats.map(([label, value]) => <View key={label} style={styles.stat}><Text style={styles.small}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>)}</View>
      <BaselineChart transactions={data.transactions} flagged={flagged} />
      <details style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
        <summary style={{ cursor: "pointer", color: theme.primary, fontFamily: "AdminInter, system-ui, sans-serif", fontSize: 12, padding: "4px 0" }}>
          Xem toàn bộ {data.transactions.length} giao dịch mẫu
        </summary>
        <div style={{ maxHeight: 280, overflowY: "auto", marginTop: 10 }}>
          <table aria-label="Danh sách giao dịch nền dùng để xem thử" style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", color: theme.text, fontSize: 11, fontFamily: "AdminInter, system-ui, sans-serif" }}>
            <thead><tr>{["#", "Ngày", "Danh mục", "Số tiền"].map((label, index) => <th key={label} scope="col" style={{ width: ["10%", "28%", "28%", "34%"][index], textAlign: index === 3 ? "right" : "left", padding: "8px 5px", background: theme.cardAlt }}>{label}</th>)}</tr></thead>
            <tbody>{data.transactions.map(row => <tr key={row.transactionId} style={{ background: flagged.has(row.transactionId) ? theme.warningBackground : undefined }}>
              {[row.transactionId, dateLabel(row.date), row.category, vnd(row.amount)].map((value, index) => <td key={index} style={{ padding: "8px 5px", borderBottom: `1px solid ${theme.border}`, textAlign: index === 3 ? "right" : "left", overflowWrap: "anywhere" }}>{value}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </View>
    <View style={styles.target}>
      <View style={styles.heading}><Text style={styles.title}>2. Nhập khoản chi thứ {data.sampleExpenseCount}</Text><Text style={styles.help}>{dateLabel(data.target.date)} · {data.target.category}</Text></View>
      <Text style={styles.help}>Khoản đang thử: <Text style={styles.emphasis}>{Number.isFinite(amount) ? vnd(amount) : "Chưa nhập"}</Text>{ratio !== null ? ` · Gấp ${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(ratio)} lần trung vị ${data.target.category.toLocaleLowerCase("vi-VN")} (${categoryRows.length} mẫu).` : ""}</Text>
      <Text style={styles.small}>Các khoản nền chỉ dùng làm lịch sử tham chiếu. Xem thử chấm riêng khoản bạn nhập và trả kết quả bình thường hoặc bất thường khi đủ dữ liệu tham chiếu.</Text>
      {data.policy ? <Text style={styles.small}>Cần ít nhất {data.policy.categoryMinCount} mẫu cùng danh mục, mốc so sánh hợp lệ và đủ dữ liệu cho model để bắt đầu đánh giá. Thiếu điều kiện nào cũng trả “Chưa đủ dữ liệu”.</Text> : null}
    </View>
  </View>;
}

function BaselineChart({ transactions, flagged }: { transactions: AnalysisPreviewTransaction[]; flagged: Set<number> }) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const [chartWidth, setChartWidth] = useState(960);
  const categories = [...new Set(transactions.map(row => row.category))];
  const max = Math.max(1, ...transactions.map(row => row.amount));
  const height = 140;
  const left = 54;
  const viewWidth = Math.max(220, chartWidth);
  const width = viewWidth - left - 12;
  const points = getTimelinePoints(transactions, left, width, height);
  const firstDay = Math.min(...points.map(point => point.day));
  const lastDay = Math.max(...points.map(point => point.day));
  const ticks = firstDay === lastDay ? [{ day: firstDay, x: left + width / 2, anchor: "middle" as const }]
    : [{ day: firstDay, x: left, anchor: "start" as const }, { day: (firstDay + lastDay) / 2, x: left + width / 2, anchor: "middle" as const }, { day: lastDay, x: left + width, anchor: "end" as const }];

  return <View style={styles.chart} onLayout={({ nativeEvent }) => setChartWidth(nativeEvent.layout.width)}>
    <svg viewBox={`0 0 ${viewWidth} 198`} role="img" aria-label={`Biểu đồ đường theo danh mục của ${transactions.length} khoản chi nền, cao nhất ${vnd(max)}. Danh sách chi tiết ở bên dưới.`} style={{ display: "block", width: "100%", minWidth: 0 }}>
      {[0, 0.5, 1].map(fraction => <g key={fraction}>
        <line x1={left} x2={left + width} y1={height + 18 - fraction * height} y2={height + 18 - fraction * height} stroke={theme.border} />
        <text x={left - 9} y={height + 22 - fraction * height} fill={theme.textMuted} fontSize={11} textAnchor="end">{new Intl.NumberFormat("vi-VN").format(max * fraction / 1000)}k</text>
      </g>)}
      {categories.map((category, index) => <polyline key={category}
        points={points.filter(point => point.row.category === category).map(point => `${point.x},${point.y}`).join(" ")}
        fill="none" stroke={categoryColors[index % categoryColors.length]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
      {points.map(({ row, x, y }) => <g key={row.transactionId}>
          <title>{`#${row.transactionId} · ${dateLabel(row.date)} · ${row.category} · ${vnd(row.amount)}${flagged.has(row.transactionId) ? " · Được đánh dấu trong kết quả thử" : ""}`}</title>
          {flagged.has(row.transactionId) ? <circle cx={x} cy={y} r={7} fill={theme.card} stroke={theme.dangerText} strokeWidth={2} /> : null}
          <circle cx={x} cy={y} r={3} fill={categoryColors[categories.indexOf(row.category) % categoryColors.length]} stroke={theme.card} strokeWidth={1} />
          <circle cx={x} cy={y} r={8} fill="transparent" />
        </g>)}
      {ticks.map((tick, index) => <text key={index} x={tick.x} y={184} textAnchor={tick.anchor} fill={theme.textMuted} fontSize={11}>{dateLabel(new Date(tick.day).toISOString())}</text>)}
    </svg>
    <View style={styles.legend}>{categories.map((category, index) => <View key={category} style={styles.inline}><View style={[styles.lineLegend, { backgroundColor: categoryColors[index % categoryColors.length] }]} /><Text style={styles.small}>{category}</Text></View>)}
      {transactions.some(row => flagged.has(row.transactionId)) ? <View style={styles.inline}><View style={[styles.dot, { borderWidth: 2, borderColor: theme.dangerText }]} /><Text style={styles.small}>Viền đỏ: được đánh dấu khi xem thử</Text></View> : null}
    </View>
    <Text style={styles.small}>Mỗi điểm là một khoản chi phát sinh vào ngày tương ứng. Đường nối cho thấy thay đổi số tiền giữa các lần chi, không có nghĩa ngày nào cũng phát sinh. Trục dọc: nghìn đồng. Di chuột lên điểm để xem chi tiết.</Text>
  </View>;
}

function transactionDay(row: AnalysisPreviewTransaction) {
  return Date.parse(`${row.date.slice(0, 10)}T00:00:00Z`);
}

function getCadence(transactions: AnalysisPreviewTransaction[]) {
  const days = [...new Set(transactions.map(transactionDay))].sort((a, b) => a - b);
  if (days.length < 2) return "Phát sinh lẻ";
  const gaps = days.slice(1).map((day, index) => (day - days[index]) / 86_400_000);
  return gaps.every(gap => gap === 1) ? "Hằng ngày" : gaps.every(gap => gap === 7) ? "Hằng tuần" : "Không định kỳ";
}

function getTimelinePoints(transactions: AnalysisPreviewTransaction[], left: number, width: number, height: number) {
  const rows = [...transactions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const days = rows.map(transactionDay);
  const first = Math.min(...days);
  const last = Math.max(...days);
  const max = Math.max(1, ...rows.map(row => row.amount));
  return rows.map((row, index) => ({ row, day: days[index],
    x: left + (last === first ? 0.5 : (days[index] - first) / (last - first)) * width,
    y: height + 18 - row.amount / max * height,
  }));
}

function createStyles(theme: AdminTheme) {
  return adminStyleSheet({
    workspace: { gap: 16 }, panel: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 16, gap: 14, minWidth: 0 },
    heading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }, title: { fontSize: 13, lineHeight: 21, fontWeight: "600", color: theme.text },
    badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: theme.cardAlt, fontSize: 10, color: theme.textMuted },
    patterns: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, pattern: { color: theme.textMuted, backgroundColor: theme.screen, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, fontSize: 11, lineHeight: 18, flexShrink: 1 },
    help: { color: theme.textMuted, fontSize: 12, lineHeight: 20 }, small: { color: theme.textMuted, fontSize: 10, lineHeight: 17 },
    stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, stat: { flex: 1, flexBasis: 155, minWidth: 0, padding: 12, backgroundColor: theme.screen, borderRadius: 7, gap: 5 }, statValue: { color: theme.text, fontSize: 14, fontWeight: "600", lineHeight: 21 },
    chart: { gap: 8, minWidth: 0 }, legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, inline: { flexDirection: "row", alignItems: "center", gap: 6 }, dot: { width: 8, height: 8, borderRadius: 2 },
    lineLegend: { width: 18, height: 2, borderRadius: 1 },
    target: { backgroundColor: theme.primaryPressed, borderRadius: 8, padding: 14, gap: 6 }, emphasis: { color: theme.text, fontWeight: "500" }, error: { color: theme.dangerText, fontSize: 12, lineHeight: 20 },
    retry: { alignSelf: "flex-start", borderWidth: 1, borderColor: theme.border, borderRadius: 7, padding: 10 }, link: { color: theme.primary, fontSize: 12 },
  });
}
