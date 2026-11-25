import type { ForecastPreviewRequest, RawForecastResponse } from '@/api/aiApi';

function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** Check the HTTP payload before date calculations or SVG rendering can throw. */
export function readForecastPreviewResponse(input: unknown, request: ForecastPreviewRequest): RawForecastResponse {
  const result = input as RawForecastResponse | null;
  const forecast = result?.forecast;
  const validAmount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (!forecast || result?.userId !== request.userId
    || !isDay(forecast.asOf) || forecast.asOf !== request.asOf
    || forecast.lookbackDays !== request.lookbackDays || forecast.forecastHorizonDays !== request.forecastDays
    || !isDay(forecast.forecastStartDate) || !isDay(forecast.forecastEndDate)
    || !validAmount(forecast.predictedTotalExpense)
    || !Array.isArray(forecast.dailyForecasts) || forecast.dailyForecasts.length !== request.forecastDays
    || forecast.dailyForecasts.some(item => !item || !isDay(item.date) || !validAmount(item.predictedExpense))) {
    throw new Error('Kết quả dự báo thiếu hoặc sai ngày chốt, kỳ dự báo hoặc số tiền. Hãy khởi động lại BE và AI rồi thử lại.');
  }
  const history = result.history ?? [];
  if (!Array.isArray(history) || history.some(item => !item || !isDay(item.date) || !validAmount(item.expense))) {
    throw new Error('Lịch sử chi tiêu trả về chưa đúng định dạng. Hãy cập nhật BE và AI rồi thử lại.');
  }
  return result;
}
