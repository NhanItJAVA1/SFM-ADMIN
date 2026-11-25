import type { CSSProperties } from "react";
import { BookOpen } from "lucide-react-native";
import { Text, View } from "react-native";

import { getAnomalyReasonGuide } from "./anomaly-reasons";
import type { AnomalyPolicy } from "@/api/aiApi";
import { adminStyleSheet, useAdminTheme } from "@/components/admin/admin-design";

export function AnomalyReasonGuide({ activeCodes = [], policy }: { activeCodes?: readonly string[]; policy?: AnomalyPolicy }) {
  const theme = useAdminTheme();
  const active = new Set(activeCodes);
  const anomalyReasonGuide = getAnomalyReasonGuide(policy);
  const styles = adminStyleSheet({
    panel: { minWidth: 0, padding: 20, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, gap: 12 },
    heading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
    title: { color: theme.text, fontSize: 14, lineHeight: 22, fontWeight: "600" },
    count: { color: theme.textMuted, backgroundColor: theme.cardAlt, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, fontSize: 10 },
    help: { color: theme.textMuted, fontSize: 11, lineHeight: 19 },
    notes: { padding: 12, backgroundColor: theme.screen, borderRadius: 7, gap: 6 },
  });
  const cell: CSSProperties = { padding: "12px 10px", borderBottom: `1px solid ${theme.border}`, verticalAlign: "top", overflowWrap: "anywhere", lineHeight: "19px" };

  return <View style={styles.panel}>
    <View style={styles.heading}><BookOpen size={18} color={theme.primary} /><Text accessibilityRole="header" style={styles.title}>Bảng giải thích Reason</Text><Text style={styles.count}>{anomalyReasonGuide.length} mã</Text></View>
    <Text style={styles.help}>Mọi khoản chi đủ dữ liệu được đưa qua một Isolation Forest dùng robust Z theo danh mục và giờ sin/cos. Không có luật cố định cho giao dịch ban đêm. Các dòng tô xanh là mã trong kết quả thử hiện tại.</Text>
    <table aria-label="Ý nghĩa và điều kiện của các mã giải thích giao dịch bất thường" style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontFamily: "AdminInter, system-ui, sans-serif", fontSize: 11, color: theme.text }}>
      <thead><tr>{["Mã Reason", "Ý nghĩa", "Điều kiện xuất hiện", "Ví dụ"].map((label, index) => <th key={label} scope="col" style={{ ...cell, width: ["25%", "25%", "25%", "25%"][index], textAlign: "left", fontWeight: 500, background: theme.cardAlt }}>{label}</th>)}</tr></thead>
      <tbody>{anomalyReasonGuide.map(reason => <tr key={reason.code} style={{ background: active.has(reason.code) ? theme.primaryPressed : undefined }}>
        <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}>
          <code style={{ fontSize: 10, fontWeight: 600 }}>{reason.code}</code>
          <div style={{ color: theme.textMuted, marginTop: 4 }}>{reason.label}</div>
          {active.has(reason.code) ? <div style={{ color: theme.primary, fontSize: 10, marginTop: 4 }}>Có trong kết quả thử</div> : null}
        </th>
        <td style={cell}>{reason.meaning}</td><td style={cell}>{reason.condition}</td><td style={cell}>{reason.example}</td>
      </tr>)}</tbody>
    </table>
    <View style={styles.notes}>
      <Text style={styles.help}>Trung vị là giá trị ở giữa khi sắp xếp số tiền; MAD là trung vị của các độ lệch tuyệt đối so với trung vị. Robust Z = 0,6745 × (số tiền − trung vị) / MAD.</Text>
      <Text style={styles.help}>Thiếu mẫu, trung vị ≤ 0 hoặc MAD = 0 thì chưa đủ dữ liệu đánh giá; không thay mốc danh mục bằng mức chi toàn người dùng. Số mẫu tối thiểu là chính sách cần kiểm định.</Text>
      <Text style={styles.help}>Tập fit chỉ dùng lịch sử trước ngày chấm. Giờ lấy theo Việt Nam; sin/cos biểu diễn chu kỳ 24 giờ để 23:59 gần 00:01. Robust Z là đặc trưng, không phải cổng lọc trước model.</Text>
      <Text style={styles.help}>Contamination mặc định auto dùng offset −0,5, không tự tìm tỷ lệ bất thường tối ưu. Số dư không tham gia quyết định của detector.</Text>
    </View>
  </View>;
}
