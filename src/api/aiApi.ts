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
  availableHistoryDays: number;
  missingDaysFilledWithZero: number;
  notes: string[];
};
export type AIForecastMetadata = {
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

export type AIForecastTrainPayload = {
  asOf: string;
  historyMonths?: number | null;
  userIds?: number[];
};

export type ForecastTrainingAccount = {
  id: number; userId: number; initialBalance: number;
  createdAt: string; deletedAt: string | null; openingBalance?: number;
};
export type ForecastTrainingTransaction = {
  id: number; accountId: number; categoryId: number | null; type: string; amount: number;
  transactionDate: string; isExcluded: boolean; createdAt: string; deletedAt: string | null;
};
export type ForecastTrainingBudget = {
  id: number; userId: number; categoryId: number | null; amount: number;
  startDate: string; endDate: string; createdAt: string; deletedAt: string | null; spentBeforeHistory?: number;
};
export type ForecastTrainingCategory = { id: number; userId: number | null; type: string };
export type ForecastTrainingSnapshot = {
  userId: number; asOf: string; historyStartDate?: string;
  accounts: ForecastTrainingAccount[]; transactions: ForecastTrainingTransaction[];
  budgets: ForecastTrainingBudget[]; categories: ForecastTrainingCategory[];
};
export type ForecastTrainingPayload = {
  users: ForecastTrainingSnapshot[]; parameters: Record<string, number>;
  originStrideDays: number; historyMonths: number | null;
};
export type ForecastTrainingPreparation = {
  preparationId: string; expiresAt: string; payload: ForecastTrainingPayload;
};

export type ForecastTrainingMetrics = {
  dailyMAE: number;
  dailyRMSE: number;
  dailyWAPE: number | null;
  sevenDayTotalWAPE: number | null;
};

export type ForecastTrainingSplitPart = {
  rowCount: number;
  userCount: number;
  firstOrigin: string;
  lastOrigin: string;
};

export type ForecastTrainingResponse = {
  runId?: string;
  candidateModelVersion?: string;
  activeModelVersion?: string | null;
  archived?: boolean;
  activated?: boolean;
  catalogSynced?: boolean;
  catalogWarning?: string | null;
  selection?: { activate: boolean; reason: string; previousModelVersion?: string | null;
    candidate?: ForecastTrainingMetrics; previous?: ForecastTrainingMetrics | null };
  status: string;
  saved: boolean;
  modelVersion: string | null;
  dataset: {
    inputUserCount: number;
    usableUserCount: number;
    skippedUserCount: number;
    skippedIncomeWindowCount: number;
    forecastWindowCount: number;
    rowCount: number;
    originStrideDays: number;
    asOf: string;
    currency: string;
    historicalMode: string;
    limitation: string;
  };
  split: {
    train: ForecastTrainingSplitPart;
    validation: ForecastTrainingSplitPart;
    test: ForecastTrainingSplitPart;
    method: string;
    purgeHorizonDays: number;
    discardedRows: number;
  };
  evaluation: {
    validation: { sampleCount: number; models: Record<string, ForecastTrainingMetrics> };
    test: { sampleCount: number; models: Record<string, ForecastTrainingMetrics> };
    saveCheck: { metric: string; baseline: string; passed: boolean; reason: string };
  };
};

export type ForecastVersion = {
  runId: string;
  modelVersion: string;
  status: 'running' | 'succeeded' | 'failed' | 'imported';
  source?: string;
  isActive: boolean;
  hasModel: boolean;
  startedAt: string;
  finishedAt?: string;
  syncedAt?: string;
  parameters?: Record<string, number>;
  calibration?: number;
  dataset?: ForecastTrainingResponse['dataset'] | null;
  split?: ForecastTrainingResponse['split'] | null;
  evaluation?: ForecastTrainingResponse['evaluation'] | null;
  selection?: ForecastTrainingResponse['selection'];
  trainLogMSE?: { initial: number; final: number; byIteration?: number[] };
  error?: { type: string; message: string };
};

export type ForecastVersionPage = {
  activeModelVersion: string | null;
  total: number;
  limit: number;
  offset: number;
  items: ForecastVersion[];
};

export type ForecastModelArtifact = {
  formatVersion: number;
  model: string;
  nFeatures: number;
  baseValue: number;
  params: Record<string, number>;
  trees: unknown[];
  metadata: { modelVersion: string; featureNames: string[]; calibration?: number };
};

export type ForecastVersionAction = { status: string; activeModelVersion: string | null;
  catalogSynced: boolean; catalogWarning?: string | null };

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

export const aiApi = {
  analysisConfigHistory: () => axiosClient.get<{ activeVersion: string; items: AnalysisConfigVersion[] }>('/v1/admin/analysis-config/history'),
  saveAnalysisConfig: (payload: { baseVersion: string; settings: AnalysisSettings; reason: string }) =>
    axiosClient.post<AnalysisConfigVersion>('/v1/admin/analysis-config', payload),
  restoreAnalysisConfig: (version: string, payload: { baseVersion: string; reason: string }) =>
    axiosClient.post<AnalysisConfigVersion>(`/v1/admin/analysis-config/${encodeURIComponent(version)}/restore`, payload),
  previewAnalysisConfig: (payload: AnalysisPreviewInput) => axiosClient.post<AnalysisPreview>('/v1/admin/analysis-config/preview', payload),
  analysisPreviewDataset: (signal?: AbortSignal) => axiosClient.get<AnalysisPreviewDataset>('/v1/admin/analysis-config/preview-data', { signal }),
  analysis: () => axiosClient.post<AIAnalysis>('/v1/FinancialAdvisor/analyze'),
  chat: (payload: AIChatPayload) => axiosClient.post<AIChatResponse>('/v1/AI/chat', payload),
  prepareForecastTraining: (payload: AIForecastTrainPayload) =>
    axiosClient.post<ForecastTrainingPreparation>('/v1/admin/forecast/train/prepare', payload),
  trainForecast: (payload: AIForecastTrainPayload | { preparationId: string }) =>
    axiosClient.post<ForecastTrainingResponse>('/v1/admin/forecast/train', payload),
  forecastVersions: (limit = 10, offset = 0) =>
    axiosClient.get<ForecastVersionPage>(`/v1/admin/forecast/versions?limit=${limit}&offset=${offset}`),
  forecastVersion: (runId: string) =>
    axiosClient.get<ForecastVersion>(`/v1/admin/forecast/versions/${encodeURIComponent(runId)}`),
  forecastModel: (runId: string) =>
    axiosClient.get<ForecastModelArtifact>(`/v1/admin/forecast/versions/${encodeURIComponent(runId)}/model`),
  activateForecastVersion: (runId: string) =>
    axiosClient.post<ForecastVersionAction>(`/v1/admin/forecast/versions/${encodeURIComponent(runId)}/activate`),
  deleteForecastVersion: (runId: string) =>
    axiosClient.delete<ForecastVersionAction>(`/v1/admin/forecast/versions/${encodeURIComponent(runId)}`),
};
