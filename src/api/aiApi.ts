import { axiosClient } from './axiosClient';

export type AIHealthStatus = 'Healthy' | 'Warning' | 'Risk' | 'InsufficientData';

export type AIHealth = {
  status: AIHealthStatus;
  cashflowStatus: AIHealthStatus;
  reserveStatus: AIHealthStatus;
  reserveMonths: number | null;
  reasons: string[];
};

export type AIAnalysisFeatures = {
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  transaction_count: number;
  current_balance: number | null;
  average_monthly_expense: number | null;
  history_months: number;
};

// Thống kê công khai tách khỏi kết quả Health và metadata của Forecast.
export type AIAnalysis = {
  features: AIAnalysisFeatures;
  health: AIHealth;
  anomalySummary: AIAnomalySummary;
  forecast: AIForecast;
  recommendations: AIRecommendation[];
  user_id: number;
  metadata: AIAnalysisMetadata;
};

export type AnomalyPolicy = {
  categoryMinCount: number;
  referenceLookbackDays: number;
  featureColumns: string[];
};

export type AnomalyAssessment = {
  transactionId: number | null; date: string; categoryId: number | null; category: string;
  amount: number; reasonCodes: string[];
  // Hai trạng thái còn lại chỉ để đọc kết quả/log phiên bản cũ.
  status: 'normal' | 'anomaly' | 'insufficient_history';
  anomalyScore: number | null;
  categorySampleCount: number; categoryMedian: number | null;
};

export type AIAnomaly = AnomalyAssessment & { status: 'anomaly' };
export type AIAnomalySummary = {
  status: 'ok' | 'partial' | 'insufficient_data';
  assessedTransactionCount: number; anomalyCount: number; insufficientCount: number;
  assessments: AnomalyAssessment[];
};

export type AIForecast = {
  status: string;
  forecastStartDate: string;
  forecastEndDate: string;
  dailyForecasts: AIDailyForecast[];
  predictedTotalExpense: number;
};
export type AIDailyForecast = { date: string; predictedExpense: number };
export type AIForecastDataQuality = {
  requiredHistoryDays?: number;
  usedHistoryDays?: number;
  availableHistoryDays: number;
  missingDaysFilledWithZero: number;
  notes: string[];
};
export type AIForecastMetadata = {
  lagDays: number;
  model: string;
  modelVersion: string | null;
  lookbackDays: number;
  forecastHorizonDays: number;
  dataQuality: AIForecastDataQuality;
};
// API Forecast độc lập có thể trả thêm chỉ số kỹ thuật; Analyze chỉ dùng bản gọn.
export type AIDataQuality = AIForecastDataQuality & { [key: string]: unknown };

export type AIRecommendation = {
  code: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | (string & {});
  title: string;
  message: string;
  action: string;
  budgetId: number | null;
  actionTarget: 'transactions' | 'budgets' | null;
};

export type AIAnalysisMetadata = {
  asOf: string;
  periodStart: string;
  periodDays: number;
  healthModel: string;
  analysisConfigVersion: string;
  recommendationMethod: string;
  forecast: AIForecastMetadata;
};

export type AIChatPayload = {
  question: string;
};

export type AIChatSource = {
  source: string;
  chunk: number;
};

export type AIChatResponse = {
  answer: string;
  sources: AIChatSource[];
};

export type ForecastPreviewRequest = {
  userId: number; asOf: string; lookbackDays: ForecastLookbackDays; forecastDays: ForecastDays;
};
export type RawForecastResponse = {
  userId: number; currency: string;
  history: { date: string; expense: number }[];
  forecast: AIForecast & AIForecastMetadata & { asOf: string; method: string };
  preprocessing: {
    historyStartDate: string | null; asOf: string; dailyRowCount: number;
    monthlyIncomeEstimate: number | null; remainingBudget: number | null; accountBalance: number;
  };
};

export type AnalysisSettings = {
  health: { reserveRiskMonths: number; reserveHealthyMonths: number; expenseHistoryMonths: number };
  anomaly: { contamination: 'auto' | number; minExpenseCount: number };
};
// Chỉ đọc lịch sử; BE không cho khôi phục Health dùng tiết kiệm/ngân sách.
export type LegacyAnalysisSettings = {
  health: { savingsRisk: number; savingsWarning: number; budgetWarning: number; budgetRisk: number };
  anomaly: AnalysisSettings['anomaly'];
};
export type AnalysisConfigVersion = {
  version: string; createdAt: string | null; actor: string; reason: string;
  restoredFrom: string | null; settingsSchemaVersion?: number;
  settings: AnalysisSettings | LegacyAnalysisSettings;
};
export type AnalysisPreviewInput = {
  settings: AnalysisSettings; income: number; expense: number; averageMonthlyExpense: number;
  unusualExpense: number; currentBalance: number;
};
export type AnalysisPreviewTransaction = {
  transactionId: number; date: string; category: string; amount: number;
};
export type AnalysisPreviewDataset = {
  currency: 'VND'; sampleExpenseCount: number;
  transactions: AnalysisPreviewTransaction[]; target: AnalysisPreviewTransaction;
  policy: AnomalyPolicy;
};
export type AnalysisPreview = {
  preview: true; currency: 'VND'; sampleExpenseCount: number;
  features: AIAnalysisFeatures;
  health: AIHealth & { model: string };
  anomaly: { summary: AIAnomalySummary };
};

export type ForecastLookbackDays = 14 | 30 | 90;
export type ForecastDays = 7 | 14 | 30;
export type ForecastOptions = { lookbackDays?: ForecastLookbackDays; forecastDays?: ForecastDays };

export const aiApi = {
  analysisConfigHistory: () => axiosClient.get<{ activeVersion: string; items: AnalysisConfigVersion[] }>('/v1/admin/analysis-config/history'),
  saveAnalysisConfig: (payload: { baseVersion: string; settings: AnalysisSettings; reason: string }) =>
    axiosClient.post<AnalysisConfigVersion>('/v1/admin/analysis-config', payload),
  restoreAnalysisConfig: (version: string, payload: { baseVersion: string; reason: string }) =>
    axiosClient.post<AnalysisConfigVersion>(`/v1/admin/analysis-config/${encodeURIComponent(version)}/restore`, payload),
  previewAnalysisConfig: (payload: AnalysisPreviewInput) => axiosClient.post<AnalysisPreview>('/v1/admin/analysis-config/preview', payload),
  analysisPreviewDataset: (signal?: AbortSignal) => axiosClient.get<AnalysisPreviewDataset>('/v1/admin/analysis-config/preview-data', { signal }),
  analysis: (options: ForecastOptions = {}) => axiosClient.post<AIAnalysis>(
    `/v1/FinancialAdvisor/analyze?${new URLSearchParams({
      lookbackDays: String(options.lookbackDays ?? 14), forecastDays: String(options.forecastDays ?? 7),
    })}`, undefined, { timeout: 130000 }),
  chat: (payload: AIChatPayload) => axiosClient.post<AIChatResponse>('/v1/AI/chat', payload),
  previewForecast: (payload: ForecastPreviewRequest, signal?: AbortSignal) =>
    axiosClient.post<RawForecastResponse>('/v1/admin/forecast/preview', payload, { signal, timeout: 130000 }),
};
