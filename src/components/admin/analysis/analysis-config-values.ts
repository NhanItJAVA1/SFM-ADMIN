import type { AnalysisSettings, LegacyAnalysisSettings } from '@/api/aiApi';

export type AnalysisConfigForm = {
  reserveRiskMonths: string;
  reserveHealthyMonths: string;
  expenseHistoryMonths: string;
  contaminationMode: 'auto' | 'ratio';
  contamination: string;
  minExpenseCount: string;
};

export function isCurrentAnalysisSettings(settings: AnalysisSettings | LegacyAnalysisSettings): settings is AnalysisSettings {
  return 'reserveRiskMonths' in settings.health && 'reserveHealthyMonths' in settings.health && 'expenseHistoryMonths' in settings.health;
}

export function numeric(value: string, signed = false) {
  const pattern = signed ? /^-?\d+(?:[.,]\d+)?$/ : /^\d+(?:[.,]\d+)?$/;
  return pattern.test(value.trim()) ? Number(value.trim().replace(',', '.')) : NaN;
}

export function toForm(settings: AnalysisSettings): AnalysisConfigForm {
  return {
    reserveRiskMonths: String(settings.health.reserveRiskMonths),
    reserveHealthyMonths: String(settings.health.reserveHealthyMonths),
    expenseHistoryMonths: String(settings.health.expenseHistoryMonths),
    contaminationMode: settings.anomaly.contamination === 'auto' ? 'auto' : 'ratio',
    contamination: settings.anomaly.contamination === 'auto' ? '5' : String(settings.anomaly.contamination * 100),
    minExpenseCount: String(settings.anomaly.minExpenseCount),
  };
}

export function parseForm(form: AnalysisConfigForm): AnalysisSettings | null {
  const risk = numeric(form.reserveRiskMonths);
  const healthy = numeric(form.reserveHealthyMonths);
  const months = numeric(form.expenseHistoryMonths);
  const minimum = numeric(form.minExpenseCount);
  const ratio = numeric(form.contamination);
  if (![risk, healthy, months, minimum].every(Number.isFinite) || risk <= 0 || risk > 24 ||
      healthy <= risk || healthy > 60 || !Number.isInteger(months) || months < 1 || months > 12 ||
      !Number.isInteger(minimum) || minimum < 20 || minimum > 500 ||
      (form.contaminationMode === 'ratio' && (!Number.isFinite(ratio) || ratio < 1 || ratio > 25))) return null;
  return {
    health: { reserveRiskMonths: risk, reserveHealthyMonths: healthy, expenseHistoryMonths: months },
    // Giữ chuỗi auto; chỉ chia 100 khi Admin chủ động chọn tỷ lệ số.
    anomaly: { contamination: form.contaminationMode === 'auto' ? 'auto' : ratio / 100, minExpenseCount: minimum },
  };
}

export function formatContamination(value: AnalysisSettings['anomaly']['contamination']) {
  return value === 'auto' ? 'Tự động (auto)' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}
