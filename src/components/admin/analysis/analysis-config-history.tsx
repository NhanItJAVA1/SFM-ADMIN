import { Check, Clock3, History, PiggyBank, RotateCcw, ScanLine, UserRound, Wallet } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { AnalysisConfigVersion } from "@/api/aiApi";
import { adminStyleSheet, useAdminTheme, type AdminTheme } from "@/components/admin/admin-design";

type Props = {
  history: AnalysisConfigVersion[];
  activeVersion: string;
  disabled: boolean;
  onRestore: (version: AnalysisConfigVersion) => void;
};

const percent = (value: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value * 100)}%`;
const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
const timeFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });

export function AnalysisConfigHistory({ history, activeVersion, disabled, onRestore }: Props) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);

  return <View style={styles.panel}>
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}><History size={19} color={theme.primary} strokeWidth={1.7} /></View>
      <View style={styles.copy}>
        <View style={styles.headingLine}><Text accessibilityRole="header" style={styles.sectionTitle}>Lịch sử cấu hình</Text><Text style={styles.count}>{history.length} phiên bản</Text></View>
        <Text style={styles.help}>Xem lại các lần thay đổi. Khôi phục sẽ tạo phiên bản mới và giữ nguyên lịch sử.</Text>
      </View>
    </View>
    <View style={styles.list}>
      {history.map(row => <ConfigVersionCard key={row.version} version={row} active={row.version === activeVersion} disabled={disabled} onRestore={() => onRestore(row)} />)}
      {!history.length ? <Text style={styles.help}>Chưa có lịch sử cấu hình.</Text> : null}
    </View>
  </View>;
}

function ConfigVersionCard({ version: row, active, disabled, onRestore }: {
  version: AnalysisConfigVersion; active: boolean; disabled: boolean; onRestore: () => void;
}) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const date = row.createdAt ? new Date(row.createdAt) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const isDefault = row.version === "default-v1" || (!row.createdAt && row.actor === "system");
  const { health, anomaly } = row.settings;

  return <View style={[styles.card, active && styles.activeCard]}>
    <View style={styles.cardHeading}>
      <View style={[styles.copy, styles.cardCopy]}>
        <View style={styles.headingLine}>
          <Text selectable style={styles.cardTitle}><Text style={styles.versionLabel}>Mã phiên bản: </Text>{row.version}</Text>
          {active ? <View style={styles.activeBadge}><Check size={12} color={theme.primary} strokeWidth={2.5} /><Text style={styles.activeText}>Đang áp dụng</Text></View> : null}
          {isDefault ? <Text style={styles.defaultBadge}>Mặc định</Text> : null}
        </View>
        <View style={styles.metadata}>
          <View style={styles.metadataItem}><Clock3 size={12} color={theme.textMuted} /><Text style={styles.metaText}>{validDate ? `${dateFormat.format(validDate)} · ${timeFormat.format(validDate)}` : isDefault ? "Cấu hình ban đầu" : "Không rõ thời gian"}</Text></View>
          <View style={styles.metadataItem}><UserRound size={12} color={theme.textMuted} /><Text style={styles.metaText}>{row.actor === "system" ? "Hệ thống" : `Admin #${row.actor}`}</Text></View>
          {row.restoredFrom ? <View style={styles.metadataItem}><RotateCcw size={11} color={theme.textMuted} /><Text style={styles.metaText}>Khôi phục từ <Text selectable>{row.restoredFrom}</Text></Text></View> : null}
          <Text style={styles.reasonText}><Text style={styles.reasonLabel}>Lý do thay đổi: </Text>{row.reason || "Không có ghi chú."}</Text>
        </View>
      </View>
      {!active ? <Pressable accessibilityRole="button" accessibilityLabel={`Khôi phục ${row.version}`} disabled={disabled} onPress={onRestore}
        style={({ hovered, pressed }) => [styles.restoreButton, (hovered || pressed) && styles.hover, disabled && styles.disabled]}>
        <RotateCcw size={14} color={theme.primary} /><Text style={styles.restoreText}>Khôi phục</Text>
      </Pressable> : null}
    </View>

    <View style={styles.metrics}>
      <View style={styles.metric}>
        <View style={styles.metricHeading}><PiggyBank size={14} color={theme.textMuted} /><Text style={styles.metricTitle}>Tiết kiệm</Text></View>
        <ThresholdSummary kind="savings" lower={health.savingsRisk} upper={health.savingsWarning} />
      </View>
      <View style={styles.metric}>
        <View style={styles.metricHeading}><Wallet size={14} color={theme.textMuted} /><Text style={styles.metricTitle}>Ngân sách</Text></View>
        <ThresholdSummary kind="budget" lower={health.budgetWarning} upper={health.budgetRisk} />
      </View>
      <View style={styles.metric}>
        <View style={styles.metricHeading}><ScanLine size={14} color={theme.textMuted} /><Text style={styles.metricTitle}>Chi tiêu bất thường</Text></View>
        <View style={styles.metricRow}><Text style={styles.help}>Độ nhạy</Text><Text style={styles.metricValue}>{percent(anomaly.contamination)}</Text></View>
        <View style={styles.metricRow}><Text style={styles.help}>Dữ liệu tối thiểu</Text><Text style={styles.metricValue}>{anomaly.minExpenseCount} khoản chi</Text></View>
      </View>
    </View>
  </View>;
}

function ThresholdSummary({ kind, lower, upper }: { kind: "savings" | "budget"; lower: number; upper: number }) {
  const styles = createStyles(useAdminTheme());
  const risk = { label: "Rủi ro", color: "#df565e" };
  const warning = { label: "Cảnh báo", color: "#e4a030" };
  const healthy = { label: "Ổn định", color: "#26976b" };
  const bands = kind === "savings" ? [risk, warning, healthy] : [healthy, warning, risk];
  const ranges = [`< ${percent(lower)}`, `${percent(lower)} – < ${percent(upper)}`, `≥ ${percent(upper)}`];

  // Equal bands summarize the three classification ranges, rather than a numeric axis.
  return <View style={styles.thresholdSummary}>
    <View style={styles.bandRow}>
      {ranges.map((range, index) => <View key={index} style={styles.bandColumn}><Text style={styles.bandValue}>{range}</Text></View>)}
    </View>
    <View style={styles.bandTrack}>
      {bands.map(band => <View key={band.label} style={[styles.bandFill, { backgroundColor: band.color }]} />)}
    </View>
    <View style={styles.bandRow}>
      {bands.map(band => <View key={band.label} style={styles.bandColumn}><Text style={styles.bandLabel}>{band.label}</Text></View>)}
    </View>
  </View>;
}

function createStyles(theme: AdminTheme) {
  return adminStyleSheet({
    panel: { padding: 20, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.card, gap: 20 },
    sectionHeading: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    sectionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.primaryPressed, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    copy: { flex: 1, minWidth: 0, gap: 7 }, headingLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 9 },
    cardCopy: { flexBasis: 260, gap: 4 },
    sectionTitle: { color: theme.text, fontSize: 15, lineHeight: 22, fontWeight: "600" },
    count: { fontSize: 10, lineHeight: 18, color: theme.textMuted, backgroundColor: theme.cardAlt, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
    help: { color: theme.textMuted, fontSize: 11, lineHeight: 18 }, list: { gap: 12 },
    card: { minWidth: 0, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 14, gap: 10 },
    activeCard: { borderColor: theme.primary, borderLeftWidth: 3 },
    cardHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    cardTitle: { color: theme.text, fontSize: 12, lineHeight: 20, fontWeight: "600", flexShrink: 1 },
    versionLabel: { color: theme.textMuted, fontSize: 12, fontWeight: "400" },
    activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.primaryPressed, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
    activeText: { color: theme.primary, fontSize: 10, lineHeight: 16, fontWeight: "500" },
    defaultBadge: { color: theme.textMuted, fontSize: 10, lineHeight: 16, backgroundColor: theme.cardAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
    metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 4 }, metadataItem: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }, metaText: { color: theme.textMuted, fontSize: 10, lineHeight: 17, flexShrink: 1 },
    restoreButton: { flexShrink: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, minHeight: 30, borderWidth: 1, borderColor: theme.border, borderRadius: 7 },
    restoreText: { color: theme.primary, fontSize: 11, fontWeight: "500" }, hover: { backgroundColor: theme.primaryPressed }, disabled: { opacity: 0.4 },
    reasonLabel: { color: theme.textMuted }, reasonText: { color: theme.text, fontSize: 11, lineHeight: 17, flexShrink: 1, minWidth: 0 },
    metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, backgroundColor: theme.screen, borderRadius: 8, padding: 10, gap: 5 },
    metricHeading: { flexDirection: "row", alignItems: "center", gap: 7 }, metricTitle: { color: theme.text, fontSize: 11, lineHeight: 18, fontWeight: "500" },
    metricRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 }, metricValue: { color: theme.text, fontSize: 11, lineHeight: 18, fontWeight: "500" },
    thresholdSummary: { gap: 4 }, bandRow: { flexDirection: "row", alignItems: "flex-end" }, bandColumn: { flex: 1, minWidth: 0, paddingHorizontal: 2 },
    bandValue: { color: theme.text, fontSize: 10, lineHeight: 16, fontWeight: "500", textAlign: "center" }, bandLabel: { color: theme.textMuted, fontSize: 10, lineHeight: 16, textAlign: "center" },
    bandTrack: { flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" }, bandFill: { flex: 1 },
  });
}
