import {
  aiApi,
  type AnalysisConfigVersion,
  type AnalysisPreview,
  type AnalysisPreviewInput,
} from "@/api/aiApi";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { adminStyleSheet, useAdminTheme } from "@/components/admin/admin-design";
import { HealthThresholdControls } from "./health/health-threshold-controls";
import { AnalysisConfigHistory } from "./analysis-config-history";
import { VndAmountInput } from "./vnd-amount-input";
import { AnomalyPreviewDataset, useAnomalyPreviewDataset } from "./anomaly/anomaly-preview-dataset";
import { AnomalyReasonGuide } from "./anomaly/anomaly-reason-guide";
import { AnomalyPreviewResult } from "./anomaly/anomaly-preview-result";
import { isCurrentAnalysisSettings, numeric, parseForm, toForm, type AnalysisConfigForm } from "./analysis-config-values";

type Form = AnalysisConfigForm;
const anomalyFields: { key: 'contamination' | 'minExpenseCount'; label: string; help: string }[] = [
  {
    key: "contamination",
    label: "Tỷ lệ tham chiếu bất thường (%)",
    help: "Từ 1–25%, dùng đặt ngưỡng điểm trên tập fit. Đây không phải xác suất gian lận hoặc tỷ lệ cảnh báo được bảo đảm.",
  },
  {
    key: "minExpenseCount",
    label: "Số giao dịch chi tham chiếu tối thiểu",
    help: "Số nguyên từ 20–500, tính trên lịch sử trước ngày chấm; không tính khoản đang kiểm tra. Danh mục còn có yêu cầu số mẫu riêng.",
  },
];
const sampleFields = [
  { key: "income", label: "Thu nhập trong kỳ (VND)", value: "18000000" },
  { key: "expense", label: "Chi tiêu trong kỳ (VND)", value: "15000000" },
  { key: "averageMonthlyExpense", label: "Chi tiêu tháng bình quân (VND)", value: "15000000" },
  { key: "currentBalance", label: "Tổng số dư hiện tại (VND)", value: "10000000" },
  { key: "unusualExpense", label: "Khoản chi cần thử (VND)", value: "3000000" },
] as const;
type SampleKey = (typeof sampleFields)[number]["key"];
const statusName = (status: string) => ({ Healthy: "Tốt theo chỉ báo", Warning: "Cần theo dõi", Risk: "Cần chú ý", InsufficientData: "Chưa đủ dữ liệu" })[status] || status;
function message(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : "Không xử lý được yêu cầu. Vui lòng thử lại.")
  );
}

export function AnalysisConfigWorkspace({ active = true }: { active?: boolean } = {}) {
  const theme = useAdminTheme();
  const styles = adminStyleSheet({
    screen: { flex: 1, backgroundColor: theme.screen },
    content: { padding: 24, gap: 18, maxWidth: 1200, width: "100%", alignSelf: "center" },
    heading: { color: theme.text, fontSize: 23, fontWeight: "600" },
    title: { color: theme.text, fontSize: 15, fontWeight: "600" },
    text: { color: theme.text, fontSize: 12, lineHeight: 20 },
    help: { color: theme.textMuted, fontSize: 12, lineHeight: 20 },
    error: { color: theme.danger, fontSize: 12, lineHeight: 20 },
    panel: {
      padding: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      gap: 14,
    },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" },
    toolbar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 },
    toolbarTabs: { flexShrink: 1, minWidth: 0 },
    reloadActions: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: "auto" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
    field: { flexGrow: 1, flexBasis: 260, gap: 7 },
    label: { color: theme.text, fontSize: 12, fontWeight: "500" },
    input: {
      color: theme.text,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 7,
      padding: 12,
      fontSize: 13,
      minHeight: 42,
    },
    button: { borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 7, backgroundColor: theme.card },
    primary: { backgroundColor: theme.primary, borderColor: theme.primary },
    primaryText: { color: theme.textInverse, fontSize: 12, fontWeight: "600" },
    disabled: { opacity: 0.4 },
    selected: { borderColor: theme.primary, backgroundColor: theme.primaryPressed },
    line: { borderTopWidth: 1, borderColor: theme.border, paddingTop: 14, gap: 6 },
    overlay: {
      flex: 1,
      padding: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,.5)",
    },
    modal: { width: "100%", maxWidth: 540, backgroundColor: theme.card, borderRadius: 12, padding: 24, gap: 18 },
  });
  const [current, setCurrent] = useState<AnalysisConfigVersion | null>(null);
  const [history, setHistory] = useState<AnalysisConfigVersion[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [tab, setTab] = useState<"health" | "anomaly">("health");
  const previewDataset = useAnomalyPreviewDataset(active && tab === "anomaly");
  const [samples, setSamples] = useState<Record<SampleKey, string>>({
    income: "18000000",
    expense: "15000000",
    averageMonthlyExpense: "15000000",
    currentBalance: "10000000",
    unusualExpense: "3000000",
  });
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<AnalysisPreview | null>(null);
  const [confirmation, setConfirmation] = useState<"save" | AnalysisConfigVersion | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const mounted = useRef(true);
  const locked = useRef(false);
  const previewRequest = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await aiApi.analysisConfigHistory();
      const active = data.items.find((row) => row.version === data.activeVersion);
      if (!active) throw new Error("Không tìm thấy cấu hình đang sử dụng.");
      if (!isCurrentAnalysisSettings(active.settings)) throw new Error("Cấu hình đang dùng là phiên bản Health cũ. Cần đồng bộ BE/AI trước khi chỉnh sửa.");
      if (mounted.current) {
        setCurrent(active);
        setHistory(data.items);
        setForm(toForm(active.settings));
        setReason("");
        setPreview(null);
      }
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  const settings = form ? parseForm(form) : null;
  const changed = current && settings && JSON.stringify(current.settings) !== JSON.stringify(settings);
  const sampleValues = Object.fromEntries(Object.entries(samples).map(([key, value]) => [key, numeric(value, key === 'currentBalance')])) as Omit<
    AnalysisPreviewInput,
    "settings"
  >;
  const samplesValid =
    Object.entries(sampleValues).every(([key, value]) => Number.isFinite(value) && value <= 1e12 && value >= (key === 'currentBalance' ? -1e12 : 0));
  const disabled = busy || loading || confirmation !== null;
  const datasetReady = tab !== "anomaly" || previewDataset.data !== null;
  function invalidatePreview() {
    previewRequest.current++;
    setPreview(null);
    setPreviewing(false);
  }

  async function runPreview() {
    if (!settings || !samplesValid || !datasetReady || disabled || previewing) return;
    const id = ++previewRequest.current;
    setPreviewing(true);
    setError("");
    try {
      const { data } = await aiApi.previewAnalysisConfig({ settings, ...sampleValues });
      if (mounted.current && id === previewRequest.current) setPreview(data);
    } catch (e) {
      if (mounted.current && id === previewRequest.current) setError(message(e));
    } finally {
      if (mounted.current && id === previewRequest.current) setPreviewing(false);
    }
  }
  async function commit() {
    if (locked.current || !confirmation || !current || (confirmation === "save" && !settings)) return;
    const note = confirmation === "save" ? reason.trim() : restoreReason.trim();
    if (!note) return;
    locked.current = true;
    setBusy(true);
    setError("");
    invalidatePreview();
    try {
      if (confirmation === "save") {
        if (!settings) return;
        await aiApi.saveAnalysisConfig({ settings, baseVersion: current.version, reason: note });
      } else await aiApi.restoreAnalysisConfig(confirmation.version, { baseVersion: current.version, reason: note });
      if (!mounted.current) return;
      setConfirmation(null);
      await load();
    } catch (e) {
      if (mounted.current) {
        setError(message(e));
        setConfirmation(null);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Cấu hình phân tích tài chính</Text>
      <Text style={styles.help}>
        Health đánh giá bằng ngưỡng nghiệp vụ. Anomaly phát hiện chi tiêu khác thường theo lịch sử từng người dùng.
      </Text>
      <View style={styles.toolbar}>
        <View style={[styles.row, styles.toolbarTabs]}>
          {current && form ? (["health", "anomaly"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              onPress={() => setTab(value)}
              style={[styles.button, tab === value && styles.selected]}
            >
              <Text style={styles.text}>
                {value === "health" ? "Health · Sức khỏe tài chính" : "Anomaly · Chi tiêu bất thường"}
              </Text>
            </Pressable>
          )) : null}
        </View>
        <View style={styles.reloadActions}>
          {loading ? <ActivityIndicator color={theme.primary} /> : null}
          <Pressable
            accessibilityRole="button"
            disabled={disabled || previewing}
            onPress={() => {
              invalidatePreview();
              void load();
            }}
            style={[styles.button, (disabled || previewing) && styles.disabled]}
          >
            <Text style={styles.text}>Tải lại cấu hình</Text>
          </Pressable>
        </View>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {current && form ? (
        <>
          <View style={styles.panel}>
            <Text style={styles.title}>
              {tab === "health" ? "Thu chi và dự phòng chi tiêu" : "Cấu hình Isolation Forest"}
            </Text>
            {tab === "health" ? (
              <HealthThresholdControls value={form} disabled={disabled} onChange={patch => {
                setForm(current => current ? { ...current, ...patch } : current);
                invalidatePreview();
              }} />
            ) : (
              <View style={styles.grid}>
                <View style={styles.field}>
                  <Text style={styles.label}>Ngưỡng điểm bất thường</Text>
                  <View style={styles.row}>
                    {(['auto', 'ratio'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio"
                      accessibilityState={{ checked: form.contaminationMode === mode }} disabled={disabled}
                      onPress={() => { setForm({ ...form, contaminationMode: mode }); invalidatePreview(); }}
                      style={[styles.button, form.contaminationMode === mode && styles.selected]}>
                      <Text style={styles.text}>{mode === 'auto' ? 'Tự động (auto)' : 'Tỷ lệ tùy chỉnh'}</Text>
                    </Pressable>)}
                  </View>
                  <Text style={styles.help}>Auto dùng mốc điểm chuẩn của Isolation Forest, không tự tìm tỷ lệ bất thường tối ưu.</Text>
                </View>
                {anomalyFields.filter(field => field.key !== 'contamination' || form.contaminationMode === 'ratio').map((field) => (
                  <View key={field.key} style={styles.field}>
                    <Text style={styles.label}>{field.label}</Text>
                    <TextInput
                      accessibilityLabel={field.label}
                      inputMode="decimal"
                      editable={!disabled}
                      value={form[field.key]}
                      onChangeText={(value) => {
                        setForm({ ...form, [field.key]: value });
                        invalidatePreview();
                      }}
                      style={styles.input}
                    />
                    <Text style={styles.help}>{field.help}</Text>
                  </View>
                ))}
              </View>
            )}
            {!settings ? (
              <Text accessibilityRole="alert" style={styles.error}>
                Kiểm tra cả hai tab: mốc dự phòng thấp &gt; 0 và ≤ 24 tháng, nhỏ hơn mốc tốt ≤ 60 tháng;
                lịch sử nguyên 1–12 tháng; IF dùng auto hoặc 1–25%; số giao dịch nguyên 20–500.
              </Text>
            ) : null}
          </View>
          <View style={styles.panel}>
            <Text style={styles.title}>Xem thử trước khi áp dụng</Text>
            <Text style={styles.help}>
              {tab === "health" ? "Nhập thu, chi, số dư và chi tháng bình quân để xem hai chỉ báo sức khỏe tài chính."
                : "Quan sát lịch sử chi tiêu mô phỏng, sau đó nhập khoản tiếp theo để đối chiếu kết quả phát hiện bất thường."} Xem thử không lưu cấu hình.
            </Text>
            {tab === "anomaly" ? <AnomalyPreviewDataset state={previewDataset} amount={sampleValues.unusualExpense} preview={preview} /> : null}
            <View style={styles.grid}>
              {sampleFields
                .filter((field) =>
                  tab === "health"
                    ? field.key !== "unusualExpense"
                    : field.key === "unusualExpense",
                )
                .map((field) => (
                  <View key={field.key} style={styles.field}>
                    <Text style={styles.label}>{field.label}</Text>
                    <VndAmountInput
                      label={field.label}
                      disabled={disabled || !datasetReady}
                      allowNegative={field.key === 'currentBalance'}
                      value={samples[field.key]}
                      onChange={(digits) => {
                        setSamples(current => ({ ...current, [field.key]: digits }));
                        invalidatePreview();
                      }}
                    />
                  </View>
                ))}
            </View>
            {!samplesValid ? (
              <Text style={styles.error}>Thu, chi và bình quân tháng từ 0 đến 1.000 tỷ VND; số dư có thể âm, trong khoảng ±1.000 tỷ VND.</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={disabled || !settings || !samplesValid || !datasetReady || previewing}
              onPress={() => void runPreview()}
              style={[styles.button, (disabled || !settings || !samplesValid || !datasetReady || previewing) && styles.disabled]}
            >
              <Text style={styles.text}>{previewing ? "Đang phân tích mẫu…" : "Xem thử kết quả"}</Text>
            </Pressable>
            {preview ? (
              tab === "health" ? (
                <View style={styles.line}>
                  <Text style={styles.title}>Kết quả: {statusName(preview.health.status)}</Text>
                  <Text style={styles.text}>
                    Thu chi: {statusName(preview.health.cashflowStatus)} · Dự phòng: {statusName(preview.health.reserveStatus)}
                  </Text>
                  <Text style={styles.text}>Số tháng dự phòng: {preview.health.reserveMonths == null ? 'Chưa đủ dữ liệu' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(preview.health.reserveMonths)} · Mẫu: {preview.features.history_months} tháng đầy đủ</Text>
                  {preview.health.reasons.map((text) => (
                    <Text key={text} style={styles.help}>
                      {text}
                    </Text>
                  ))}
                </View>
              ) : (
                <AnomalyPreviewResult preview={preview} targetId={previewDataset.data?.target.transactionId} />
              )
            ) : null}
          </View>
          {tab === "anomaly" ? <AnomalyReasonGuide
            activeCodes={preview?.anomaly.summary.assessments.flatMap(row => row.reasonCodes) ?? []}
            policy={previewDataset.data?.policy} /> : null}
          <View style={styles.panel}>
            <Text style={styles.title}>Lưu và áp dụng cho các lần phân tích tiếp theo</Text>
            <TextInput
              accessibilityLabel="Lý do thay đổi cấu hình"
              placeholder="Ví dụ: giảm cảnh báo cho chi tiêu mua sắm thông thường"
              placeholderTextColor={theme.inputPlaceholder}
              editable={!disabled}
              maxLength={500}
              value={reason}
              onChangeText={setReason}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              disabled={disabled || !changed || !reason.trim()}
              onPress={() => setConfirmation("save")}
              style={[styles.button, styles.primary, (disabled || !changed || !reason.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>Lưu và áp dụng cấu hình</Text>
            </Pressable>
          </View>
          <AnalysisConfigHistory history={history} activeVersion={current.version} disabled={disabled}
            onRestore={row => {
              if (!isCurrentAnalysisSettings(row.settings)) return;
              setRestoreReason("");
              setConfirmation(row);
            }} />
        </>
      ) : null}
      <Modal
        visible={active && confirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmation(null);
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>
              {confirmation === "save" ? "Áp dụng cấu hình mới?" : "Khôi phục cấu hình cũ?"}
            </Text>
            <Text style={styles.help}>
              Các lần phân tích tiếp theo sẽ dùng cấu hình này. Kết quả đã lưu trước đây không được tính lại.
            </Text>
            {confirmation && confirmation !== "save" ? (
              <>
                <Text style={styles.text}>{confirmation.version}</Text>
                <TextInput
                  accessibilityLabel="Lý do khôi phục cấu hình"
                  placeholder="Nhập lý do khôi phục"
                  placeholderTextColor={theme.inputPlaceholder}
                  editable={!busy}
                  value={restoreReason}
                  onChangeText={setRestoreReason}
                  maxLength={500}
                  style={styles.input}
                />
              </>
            ) : (
              <Text style={styles.text}>{reason}</Text>
            )}
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setConfirmation(null)}
                style={styles.button}
              >
                <Text style={styles.text}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy || !(confirmation === "save" ? reason.trim() : restoreReason.trim())}
                onPress={() => void commit()}
                style={[styles.button, styles.primary, busy && styles.disabled]}
              >
                <Text style={styles.primaryText}>{busy ? "Đang lưu…" : "Xác nhận áp dụng"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
