import { AlertCircle, CheckCircle2, HelpCircle, Info } from "lucide-react-native";
import { Text, View } from "react-native";

import type { AnalysisPreview, AnomalyAssessment } from "@/api/aiApi";
import { getAnomalyReasonLabel } from "./anomaly-reasons";
import { adminStyleSheet, useAdminTheme } from "@/components/admin/admin-design";

const vnd = (value: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} đ`;
const number = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

function statusLabel(status: AnomalyAssessment['status']) {
  return {
    normal: "Không bị mô hình đánh dấu bất thường", anomaly: "Phát hiện giao dịch bất thường",
    insufficient_history: "Chưa đủ dữ liệu"
  }[status];
}

export function AnomalyPreviewResult({ preview, targetId }: { preview: AnalysisPreview; targetId?: number }) {
  const theme = useAdminTheme();
  const summary = preview.anomaly.summary;
  const target = targetId == null ? summary.assessments[0] : summary.assessments.find(row => row.transactionId === targetId);
  const styles = adminStyleSheet({
    panel: { gap: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 },
    heading: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { flex: 1, minWidth: 0, color: theme.text, fontSize: 14, lineHeight: 22, fontWeight: "600" },
    help: { color: theme.textMuted, fontSize: 11, lineHeight: 19 },
    card: { borderWidth: 1, borderColor: theme.border, borderRadius: 9, padding: 14, gap: 10 },
    stats: { flexDirection: "row", flexWrap: "wrap", gap: 16 }, stat: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: 4 },
    value: { fontSize: 12, fontWeight: "500", color: theme.text, lineHeight: 20 },
    reasons: { gap: 5 }, reason: { color: theme.text, fontSize: 11, lineHeight: 19 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 7 }, noteText: { flex: 1, minWidth: 0, color: theme.textMuted, fontSize: 11, lineHeight: 19 },
  });

  if (!target) {
    // Preview chỉ chấm một khoản; assessments rỗng là hợp lệ trong hợp đồng gọn.
    const evaluated = summary.assessedTransactionCount === 1 && summary.anomalyCount === 0 &&
      summary.insufficientCount === 0 && summary.status === 'ok';
    const incomplete = summary.insufficientCount > 0 || summary.status === 'insufficient_data';
    const label = evaluated ? 'Không bị mô hình đánh dấu bất thường' : incomplete ? 'Chưa đủ dữ liệu để đánh giá' : 'Chưa xác định được kết quả khoản thử';
    const EmptyIcon = evaluated ? CheckCircle2 : HelpCircle;
    const tone = evaluated ? theme.primary : theme.warning;
    return <View style={styles.panel}>
      <View style={styles.heading}><EmptyIcon size={19} color={tone} /><Text accessibilityLiveRegion="polite" style={[styles.title, { color: tone }]}>{label}</Text></View>
      <Text style={styles.help}>Đã đưa {summary.assessedTransactionCount} khoản vào quy trình: {summary.anomalyCount} cảnh báo, {summary.insufficientCount} chưa đủ dữ liệu.</Text>
      <Text style={styles.help}>{evaluated ? 'Khoản thử đã được chấm; API chỉ gửi chi tiết khi bị đánh dấu. Không có điểm số công khai cho khoản này.' : 'Danh sách cảnh báo rỗng không có nghĩa khoản thử đã được kết luận bình thường. Kiểm tra lịch sử danh mục và mốc median/MAD.'}</Text>
    </View>;
  }
  const tone = target.status === "anomaly" ? theme.dangerText : target.status === "normal" ? theme.primary : theme.warning;
  const Icon = target.status === "normal" ? CheckCircle2 : target.status === "anomaly" ? AlertCircle : HelpCircle;
  const stats = [["Lịch sử cùng danh mục", `${target.categorySampleCount} khoản`],
  ["Trung vị cùng danh mục", target.categoryMedian !== null ? vnd(target.categoryMedian) : "Chưa có"],
  ["Giờ giao dịch Việt Nam", new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(target.date))]];

  return <View style={styles.panel}>
    <View style={styles.heading}><Icon size={19} color={tone} /><Text accessibilityLiveRegion="polite" style={[styles.title, { color: tone }]}>{statusLabel(target.status)}</Text></View>
    <Text style={styles.help}>Khoản #{target.transactionId} · {target.category} · {vnd(target.amount)}. Đã đưa {summary.assessedTransactionCount} khoản vào quy trình: {summary.anomalyCount} cảnh báo, {summary.insufficientCount} chưa đủ dữ liệu.</Text>
    <View style={styles.card}>
      <View style={styles.stats}>{stats.map(([label, value]) => <View key={label} style={styles.stat}><Text style={styles.help}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}</View>
      <View style={styles.reasons}>{target.reasonCodes.map(code => <Text key={code} style={styles.reason}>• {getAnomalyReasonLabel(code)}</Text>)}</View>
      {target.reasonCodes.includes("LARGE_SHARE_OF_BALANCE") ? <Text style={styles.help}>Phiên bản cũ đánh dấu trực tiếp theo số dư. Quy tắc này không còn dùng trong mô hình hiện tại.</Text> : null}
      {target.status === "normal" ? <Text style={styles.help}>Đã đủ dữ liệu tham chiếu; chưa phát hiện bất thường theo chính sách hiện tại.</Text> : null}
    </View>
    <View style={styles.note}><Info size={14} color={theme.textMuted} /><Text style={styles.noteText}>Chỉ dùng các giao dịch trước ngày {target.date.slice(0, 10).split("-").reverse().join("/")} làm mốc; không dùng khoản đang kiểm tra hoặc các khoản cùng ngày. Dữ liệu mẫu dùng để đối chiếu hành vi hệ thống, không phải kết quả đã được xác nhận đúng/sai.</Text></View>
    {target.status === "anomaly" && target.anomalyScore !== null ? <Text style={styles.help}>Điểm xếp hạng: {number(target.anomalyScore)}. Điểm này không phải xác suất bất thường.</Text> : null}
  </View>;
}
