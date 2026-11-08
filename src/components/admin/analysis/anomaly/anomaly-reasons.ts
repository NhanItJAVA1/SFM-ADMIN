import type { AnomalyPolicy } from '@/api/aiApi';

/** Chú giải dùng chung trong UI Anomaly. Quyết định phân loại nằm ở anomaly_service.py. */
export function getAnomalyReasonGuide(policy?: AnomalyPolicy) {
  const minimum = policy?.categoryMinCount ?? 20;
  return [
    {
      code: 'ISOLATION_FOREST_OUTLIER', label: 'Khác thường so với lịch sử chi tiêu',
      meaning: 'Một IF đánh giá đồng thời độ lệch số tiền trong danh mục và giờ giao dịch theo thói quen cá nhân.',
      condition: 'Đủ dữ liệu tham chiếu và decision_function < 0. Không áp thêm ngưỡng robust Z hoặc tỷ trọng số dư.',
      example: 'Khoản có số tiền bình thường vẫn có thể được đánh dấu khi tổ hợp số tiền và giờ khác lịch sử. Chưa kết luận riêng đặc trưng nào là nguyên nhân.'
    },
    {
      code: 'LIMITED_HISTORY', label: 'Chưa đủ dữ liệu',
      meaning: 'Chưa có đủ lịch sử tham chiếu tin cậy để đánh giá khoản chi.',
      condition: `Dưới ${minimum} mẫu cùng danh mục, median/MAD không hợp lệ hoặc chưa đủ tập fit. Trạng thái này phản ánh qua số đếm, không xuất chi tiết trong assessments mới.`,
      example: 'Danh mục chỉ có 7 khoản hoặc các khoản có số tiền bằng nhau làm MAD = 0: chưa đủ cơ sở chấm IF.'
    },
  ];
}

const reasonLabels = new Map(getAnomalyReasonGuide().map(reason => [reason.code, reason.label]));
// Giữ nhãn để đọc log cũ; các mã này không còn là chính sách đang áp dụng.
reasonLabels.set('HIGH_VS_CATEGORY_MEDIAN', 'Cao so với danh mục · quy tắc cũ');
reasonLabels.set('HIGH_CATEGORY_ROBUST_Z', 'Lệch nhiều trong danh mục · quy tắc cũ');
reasonLabels.set('LARGE_SHARE_OF_BALANCE', 'Chi lớn so với số dư · quy tắc cũ');
export function getAnomalyReasonLabel(code: string): string {
  return reasonLabels.get(code) ?? code;
}

