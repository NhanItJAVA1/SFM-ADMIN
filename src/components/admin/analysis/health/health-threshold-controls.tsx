import type { CSSProperties, KeyboardEvent } from "react";
import { useId } from "react";
import { Info, PiggyBank, Wallet } from "lucide-react-native";
import { Text, TextInput, View } from "react-native";

import { adminStyleSheet, useAdminTheme, type AdminTheme } from "@/components/admin/admin-design";

export type HealthThresholdValues = {
  reserveRiskMonths: string;
  reserveHealthyMonths: string;
  expenseHistoryMonths: string;
};

type ThresholdKind = "reserve";
type Props = {
  value: HealthThresholdValues;
  disabled: boolean;
  onChange: (patch: Partial<HealthThresholdValues>) => void;
};

const colors = { healthy: "#26976b", warning: "#e4a030", risk: "#df565e" };
const sliderStep = 0.1;
const options = {
  reserve: {
    title: "Số tháng dự phòng",
    description: "Khả năng trang trải chi tiêu từ số dư hiện có.",
    lowerKey: "reserveRiskMonths",
    upperKey: "reserveHealthyMonths",
    lowerLabel: "Mốc dự phòng thấp",
    upperLabel: "Mốc dự phòng tốt",
    min: 0,
    max: 60,
    defaults: [1, 6],
    Icon: PiggyBank,
    note: "Mốc thấp từ trên 0 đến 24 tháng; mốc tốt lớn hơn mốc thấp và tối đa 60 tháng. Mặc định 1 và 6 tháng tham khảo CFSI; ngưỡng tùy chỉnh là chính sách của hệ thống.",
  },
} as const;

function readPercent(value: string) {
  return /^\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;
}

/** Kéo theo bước 0,1 tháng, không vượt mốc còn lại hoặc giới hạn API. */
function moveThreshold(value: number, index: number, lower: number, upper: number, max: number) {
  const minimum = index === 0 ? sliderStep : (Math.floor(lower / sliderStep) + 1) * sliderStep;
  const maximum = index === 0 ? Math.min(24, (Math.ceil(upper / sliderStep) - 1) * sliderStep) : max;
  if (minimum > maximum) return index === 0 ? lower : upper;
  return Number(Math.min(maximum, Math.max(minimum, Math.round(value / sliderStep) * sliderStep)).toFixed(8));
}

const formatMonths = (value: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(value)} tháng`;

// Native range controls retain touch, pointer and keyboard support. Only their
// thumbs accept pointer events, so the two inputs can share the same track.
const sliderCss = `
.health-threshold-slider { appearance:none; -webkit-appearance:none; position:absolute; top:0; height:40px; margin:0; padding:0; border:0; background:transparent; pointer-events:none; outline:none; }
.health-threshold-slider::-webkit-slider-runnable-track { height:8px; background:transparent; }
.health-threshold-slider::-moz-range-track { height:8px; background:transparent; }
.health-threshold-slider::-webkit-slider-thumb { appearance:none; -webkit-appearance:none; box-sizing:border-box; width:20px; height:22px; margin-top:-7px; border:0; border-radius:0; background:linear-gradient(90deg,transparent 7px,#fff 7px,#fff 13px,transparent 13px); filter:drop-shadow(0 1px 2px #0005); cursor:grab; pointer-events:auto; }
.health-threshold-slider::-moz-range-thumb { box-sizing:border-box; width:20px; height:22px; border:0; border-radius:0; background:linear-gradient(90deg,transparent 7px,#fff 7px,#fff 13px,transparent 13px); filter:drop-shadow(0 1px 2px #0005); cursor:grab; pointer-events:auto; }
.health-threshold-slider:active::-webkit-slider-thumb { cursor:grabbing; }
.health-threshold-slider:active::-moz-range-thumb { cursor:grabbing; }
.health-threshold-slider:focus-visible::-webkit-slider-thumb { outline:2px solid currentColor; outline-offset:3px; }
.health-threshold-slider:focus-visible::-moz-range-thumb { outline:2px solid currentColor; outline-offset:3px; }
.health-threshold-slider:disabled::-webkit-slider-thumb { pointer-events:none; cursor:default; }
.health-threshold-slider:disabled::-moz-range-thumb { pointer-events:none; cursor:default; }
`;

export function HealthThresholdControls(props: Props) {
  const styles = createStyles(useAdminTheme());
  return (
    <View style={styles.grid}>
      <style>{sliderCss}</style>
      <View style={styles.card}>
        <View style={styles.heading}><Wallet size={20} /><Text style={styles.title}>Cân đối thu chi</Text></View>
        <Text style={styles.help}>Thu lớn hơn chi: tốt theo chỉ báo. Thu bằng chi: cần theo dõi. Chi lớn hơn thu: cần chú ý. Chưa có giao dịch: chưa đủ dữ liệu.</Text>
        <Text style={styles.help}>Chỉ báo này dùng thu chi đã ghi nhận. Ngưỡng cảnh báo ngân sách được đặt riêng trong từng ngân sách.</Text>
        <Text style={styles.label}>Số tháng lịch sử tính chi bình quân</Text>
        <View style={styles.inputBox}><TextInput accessibilityLabel="Số tháng lịch sử tính chi bình quân" inputMode="numeric"
          editable={!props.disabled} value={props.value.expenseHistoryMonths}
          onChangeText={value => props.onChange({ expenseHistoryMonths: value })} style={styles.input} /><Text style={styles.unit}>tháng</Text></View>
        <Text style={styles.help}>Số nguyên từ 1–12. Chỉ lấy tháng lịch đã hoàn thành; dữ liệu thực tế có thể chỉ đủ 1–2 tháng. Không có mẫu phù hợp thì kết quả dự phòng là chưa đủ dữ liệu.</Text>
      </View>
      <HealthThresholdCard kind="reserve" {...props} />
    </View>
  );
}

function HealthThresholdCard({ kind, value, disabled, onChange }: Props & { kind: ThresholdKind }) {
  const theme = useAdminTheme();
  const styles = createStyles(theme);
  const descriptionId = useId();
  const config = options[kind];
  const { Icon } = config;
  const rawLower = readPercent(value[config.lowerKey]);
  const rawUpper = readPercent(value[config.upperKey]);
  const valid =
    Number.isFinite(rawLower) &&
    Number.isFinite(rawUpper) &&
    rawLower > 0 && rawLower <= 24 &&
    rawLower < rawUpper &&
    rawUpper <= config.max;
  const [lower, upper] = valid ? [rawLower, rawUpper] : config.defaults;
  const position = (number: number) => ((number - config.min) / (config.max - config.min)) * 100;
  const lowerPosition = position(lower);
  const upperPosition = position(upper);
  const offset = position(0);
  const palette = [colors.risk, colors.warning, colors.healthy];
  const thumbColors = [colors.risk, colors.warning];
  const labels = ["Cần chú ý", "Cần theo dõi", "Tốt theo chỉ báo"];
  const descriptions = valid
    ? [
        `Dưới ${formatMonths(lower)}`,
        `${formatMonths(lower)} đến dưới ${formatMonths(upper)}`,
        `Từ ${formatMonths(upper)} trở lên`,
      ]
    : ["—", "—", "—"];
  const rangeStyle: CSSProperties = { left: `calc(${offset}% - 10px)`, width: `calc(${100 - offset}% + 20px)` };

  function move(index: number, next: number) {
    if (disabled || !valid || !Number.isFinite(next)) return;
    const result = moveThreshold(next, index, lower, upper, config.max);
    onChange({ [index === 0 ? config.lowerKey : config.upperKey]: String(result) });
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>, index: number, current: number) {
    const step = event.shiftKey ? 1 : sliderStep;
    const previous = (Math.ceil(current / step) - 1) * step;
    const nextTick = (Math.floor(current / step) + 1) * step;
    const next = {
      ArrowLeft: previous,
      ArrowDown: previous,
      ArrowRight: nextTick,
      ArrowUp: nextTick,
      PageDown: current - 1,
      PageUp: current + 1,
      Home: 0,
      End: config.max,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    move(index, next);
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Icon size={20} color={theme.primary} strokeWidth={1.6} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.help}>{config.description}</Text>
        </View>
      </View>
      <View style={styles.fields}>
        {[config.lowerKey, config.upperKey].map((key, index) => (
          <View key={key} style={styles.field}>
            <View style={styles.fieldLabel}>
              <View style={[styles.dot, { backgroundColor: thumbColors[index] }]} />
              <Text style={styles.label}>{index === 0 ? config.lowerLabel : config.upperLabel}</Text>
            </View>
            <View style={[styles.inputBox, !valid && styles.invalid, disabled && styles.disabled]}>
              <TextInput
                accessibilityLabel={`${config.title}: ${index === 0 ? config.lowerLabel : config.upperLabel} (tháng)`}
                inputMode="decimal"
                editable={!disabled}
                value={value[key]}
                onChangeText={(next) => onChange({ [key]: next })}
                style={styles.input}
              />
              <Text style={styles.unit}>tháng</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={(disabled || !valid) && styles.disabled}>
        <div style={{ position: "relative", height: 40, margin: "0 10px" }}>
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 0,
              right: 0,
              height: 8,
              borderRadius: 5,
              overflow: "hidden",
              display: "flex",
            }}
            aria-hidden="true"
          >
            {[lowerPosition, upperPosition - lowerPosition, 100 - upperPosition].map((width, index) => (
              <div key={index} style={{ width: `${width}%`, background: palette[index] }} />
            ))}
          </div>
          {/* Giữ số thập phân đã nhập; move() chỉ làm tròn khi kéo hoặc dùng phím. */}
          {[lower, upper].map((current, index) => (
            <input
              key={index}
              className="health-threshold-slider"
              type="range"
              min={0}
              max={config.max}
              step="any"
              value={current}
              disabled={disabled || !valid}
              aria-label={`${config.title}: ${index === 0 ? config.lowerLabel : config.upperLabel}`}
              aria-valuetext={formatMonths(current)}
              aria-describedby={descriptionId}
              style={{ ...rangeStyle, color: thumbColors[index], zIndex: index + 1 }}
              onChange={(event) => move(index, event.target.valueAsNumber)}
              onKeyDown={(event) => handleKey(event, index, current)}
            />
          ))}
        </div>
        <View style={styles.scale}>
          <Text style={styles.tick}>0 tháng</Text>
          <Text style={styles.tick}>{config.max} tháng</Text>
        </View>
      </View>
      {!valid ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Mốc thấp phải lớn hơn 0, tối đa 24 tháng và nhỏ hơn mốc tốt; mốc tốt tối đa {config.max} tháng.
        </Text>
      ) : null}
      <View style={styles.legend}>
        {labels.map((label, index) => (
          <View key={label} style={styles.legendItem}>
            <View style={styles.fieldLabel}>
              <View style={[styles.dot, { backgroundColor: palette[index] }]} />
              <Text style={styles.label}>{label}</Text>
            </View>
            <Text style={styles.legendDescription}>{descriptions[index]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.note}>
        <Info size={14} color={theme.textMuted} />
        <Text nativeID={descriptionId} style={styles.noteText}>
          {config.note} Kéo mốc theo bước 0,1 tháng; nhập số ở trên nếu cần giá trị chi tiết hơn.
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AdminTheme) {
  return adminStyleSheet({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    card: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 400,
      minWidth: 0,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
      gap: 20,
    },
    heading: { flexDirection: "row", alignItems: "center", gap: 12 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primaryPressed,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    title: { color: theme.text, fontSize: 14, lineHeight: 21, fontWeight: "600" },
    help: { color: theme.textMuted, fontSize: 11, lineHeight: 18 },
    fields: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    field: { flex: 1, flexBasis: 140, minWidth: 0, gap: 9 },
    fieldLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
    dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
    label: { color: theme.text, fontSize: 11, lineHeight: 18, fontWeight: "500", flexShrink: 1 },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 42,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.screen,
    },
    input: { flex: 1, minWidth: 0, paddingVertical: 10, color: theme.text, fontSize: 14, fontWeight: "500" },
    unit: { fontSize: 12, color: theme.textMuted, marginLeft: 8 },
    scale: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
    tick: { color: theme.textMuted, fontSize: 10 },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 16,
    },
    legendItem: { flexGrow: 1, flexBasis: 110, minWidth: 0, gap: 5 },
    legendDescription: { color: theme.textMuted, fontSize: 10, lineHeight: 17 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    noteText: { flex: 1, minWidth: 0, color: theme.textMuted, fontSize: 11, lineHeight: 18 },
    disabled: { opacity: 0.45 },
    invalid: { borderColor: theme.dangerText },
    error: { color: theme.dangerText, fontSize: 11, lineHeight: 18 },
  });
}
