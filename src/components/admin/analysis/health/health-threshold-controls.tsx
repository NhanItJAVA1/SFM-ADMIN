import type { CSSProperties, KeyboardEvent } from "react";
import { useId } from "react";
import { Info, PiggyBank, Wallet } from "lucide-react-native";
import { Text, TextInput, View } from "react-native";

import { adminStyleSheet, useAdminTheme, type AdminTheme } from "@/components/admin/admin-design";

export type HealthThresholdValues = {
  savingsRisk: string;
  savingsWarning: string;
  budgetWarning: string;
  budgetRisk: string;
};

type ThresholdKind = "savings" | "budget";
type Props = {
  value: HealthThresholdValues;
  disabled: boolean;
  onChange: (patch: Partial<HealthThresholdValues>) => void;
};

const colors = { healthy: "#26976b", warning: "#e4a030", risk: "#df565e" };
const sliderStep = 0.5;
const options = {
  savings: {
    title: "Tỷ lệ tiết kiệm",
    description: "Phần thu nhập còn lại sau chi tiêu.",
    lowerKey: "savingsRisk",
    upperKey: "savingsWarning",
    lowerLabel: "Ngưỡng rủi ro",
    upperLabel: "Ngưỡng cảnh báo",
    min: -20,
    max: 100,
    defaults: [0, 20],
    Icon: PiggyBank,
    note: "Chi vượt thu nhập luôn được đánh giá là Rủi ro. Hai ngưỡng có thể điều chỉnh trong khoảng 0–100%.",
  },
  budget: {
    title: "Mức sử dụng ngân sách",
    description: "Tỷ lệ đã chi so với hạn mức ngân sách.",
    lowerKey: "budgetWarning",
    upperKey: "budgetRisk",
    lowerLabel: "Ngưỡng cảnh báo",
    upperLabel: "Ngưỡng rủi ro",
    min: 0,
    max: 300,
    defaults: [80, 100],
    Icon: Wallet,
    note: "100% tương đương dùng hết ngân sách. Hai ngưỡng có thể điều chỉnh trong khoảng 0–300%.",
  },
} as const;

function readPercent(value: string) {
  return /^\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;
}

/** Snap dragging to a 0.5% grid, without crossing a manually entered threshold. */
function moveThreshold(value: number, index: number, lower: number, upper: number, max: number) {
  const tick = Math.round(value / sliderStep);
  const boundedTick =
    index === 0
      ? Math.max(0, Math.min(tick, Math.ceil(upper / sliderStep) - 1))
      : Math.min(max / sliderStep, Math.max(tick, Math.floor(lower / sliderStep) + 1));
  return boundedTick * sliderStep;
}

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(value)}%`;

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
      <HealthThresholdCard kind="savings" {...props} />
      <HealthThresholdCard kind="budget" {...props} />
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
    rawLower >= 0 &&
    rawLower < rawUpper &&
    rawUpper <= config.max;
  const [lower, upper] = valid ? [rawLower, rawUpper] : config.defaults;
  const position = (number: number) => ((number - config.min) / (config.max - config.min)) * 100;
  const lowerPosition = position(lower);
  const upperPosition = position(upper);
  const offset = position(0);
  const palette =
    kind === "savings" ? [colors.risk, colors.warning, colors.healthy] : [colors.healthy, colors.warning, colors.risk];
  const thumbColors = kind === "savings" ? [colors.risk, colors.warning] : [colors.warning, colors.risk];
  const labels = kind === "savings" ? ["Rủi ro", "Cảnh báo", "Ổn định"] : ["Ổn định", "Cảnh báo", "Rủi ro"];
  const descriptions = valid
    ? [
        `Dưới ${formatPercent(lower)}`,
        `${formatPercent(lower)} đến dưới ${formatPercent(upper)}`,
        `Từ ${formatPercent(upper)} trở lên`,
      ]
    : ["—", "—", "—"];
  const rangeStyle: CSSProperties = { left: `calc(${offset}% - 10px)`, width: `calc(${100 - offset}% + 20px)` };

  function move(index: number, next: number) {
    if (disabled || !valid || !Number.isFinite(next)) return;
    const result = moveThreshold(next, index, lower, upper, config.max);
    onChange({ [index === 0 ? config.lowerKey : config.upperKey]: String(result) });
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>, index: number, current: number) {
    const step = event.shiftKey ? 10 : sliderStep;
    const previous = (Math.ceil(current / step) - 1) * step;
    const nextTick = (Math.floor(current / step) + 1) * step;
    const next = {
      ArrowLeft: previous,
      ArrowDown: previous,
      ArrowRight: nextTick,
      ArrowUp: nextTick,
      PageDown: current - 10,
      PageUp: current + 10,
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
                accessibilityLabel={`${config.title}: ${index === 0 ? config.lowerLabel : config.upperLabel} (%)`}
                inputMode="decimal"
                editable={!disabled}
                value={value[key]}
                onChangeText={(next) => onChange({ [key]: next })}
                style={styles.input}
              />
              <Text style={styles.unit}>%</Text>
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
          {/* Preserve typed decimals in the native control; move() snaps slider interactions to 0.5%. */}
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
              aria-valuetext={formatPercent(current)}
              aria-describedby={descriptionId}
              style={{ ...rangeStyle, color: thumbColors[index], zIndex: index + 1 }}
              onChange={(event) => move(index, event.target.valueAsNumber)}
              onKeyDown={(event) => handleKey(event, index, current)}
            />
          ))}
        </div>
        <View style={styles.scale}>
          <Text style={styles.tick}>{kind === "savings" ? "≤ −20%" : "0%"}</Text>
          <Text style={styles.tick}>{config.max}%</Text>
        </View>
      </View>
      {!valid ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Nhập hai ngưỡng từ 0–{config.max}%, với{" "}
          {kind === "savings" ? "rủi ro nhỏ hơn cảnh báo" : "cảnh báo nhỏ hơn rủi ro"}.
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
          {config.note} Kéo mốc theo bước 0,5%; nhập số ở trên nếu cần giá trị chi tiết hơn.
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
