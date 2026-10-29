import type { AnomalyPolicy } from '@/api/aiApi';

/** Chú giải dùng chung trong UI Anomaly. Quyết định phân loại nằm ở anomaly_service.py. */
export function getAnomalyReasonGuide(policy?: AnomalyPolicy) {
  const minimum = policy?.categoryMinCount ?? 20;
  const ratio = policy?.categoryRatioLimit ?? 3;
  const z = policy?.categoryZLimit ?? 3.5;
  const balance = (policy?.balanceShareLimit ?? 0.3) * 100;
  const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
  return [
    {
      code: 'HIGH_VS_CATEGORY_MEDIAN', label: 'Cao so với danh mục',
      meaning: 'Khoản chi cao so với trung vị CÙNG danh mục trước ngày đang kiểm tra.',
      condition: `Khoản được đánh dấu bất thường và số tiền / trung vị danh mục ≥ ${number(ratio)} lần.`,
      example: `Trung vị 200.000đ → từ ${number(200000 * ratio)}đ đáp ứng điều kiện.`
    },
    {
      code: 'HIGH_CATEGORY_ROBUST_Z', label: 'Lệch nhiều trong danh mục',
      meaning: 'Lệch cao hoặc thấp so với mức dao động của chính danh mục, không so với ăn uống/toàn bộ user.',
      condition: `Khoản được đánh dấu bất thường và |Robust Z danh mục| ≥ ${number(z)}.`,
      example: 'Khoản mua sắm khác biệt rõ với các khoản mua sắm trước đó.'
    },
    {
      code: 'LARGE_SHARE_OF_BALANCE', label: 'Chi lớn so với số dư hiện tại',
      meaning: 'Đánh dấu bất thường trực tiếp theo tỷ trọng số dư, không cần đủ lịch sử hoặc chạy model.',
      condition: `Khoản chi > 0 và đạt ít nhất ${number(balance)}% tổng số dư hiện tại đã biết.`,
      example: `Số dư 10.000.000đ → từ ${number(10000000 * balance / 100)}đ được đánh dấu ngay.`
    },
    {
      code: 'LIMITED_HISTORY', label: 'Chưa đủ dữ liệu',
      meaning: 'Chưa có đủ lịch sử tham chiếu tin cậy để đánh giá khoản chi.',
      condition: `Không thuộc nhánh số dư và dưới ${minimum} mẫu cùng danh mục, mốc so sánh không hợp lệ hoặc chưa đủ mẫu hợp lệ cho model.`,
      example: 'Danh mục có 7 khoản, khoản chi dưới ngưỡng số dư: chờ thêm lịch sử.'
    },
  ];
}

const reasonLabels = new Map(getAnomalyReasonGuide().map(reason => [reason.code, reason.label]));
export function getAnomalyReasonLabel(code: string): string {
  return reasonLabels.get(code) ?? code;
}

