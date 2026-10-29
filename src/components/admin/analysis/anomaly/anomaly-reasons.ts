import type { AnomalyPolicy } from '@/api/aiApi';

/** Chú giải dùng chung trong UI Anomaly. Quyết định phân loại nằm ở anomaly_service.py. */
export function getAnomalyReasonGuide(policy?: AnomalyPolicy) {
  const minimum = policy?.categoryMinCount ?? 20;
  const ratio = policy?.categoryRatioLimit ?? 3;
  const z = policy?.categoryZLimit ?? 3.5;
  const income = (policy?.incomeShareLimit ?? 0.2) * 100;
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
      code: 'LARGE_SHARE_OF_MONTHLY_INCOME', label: 'Chiếm tỷ trọng thu nhập lớn',
      meaning: 'Thông tin ảnh hưởng tài chính bổ sung; không tự quyết định nhãn bất thường.',
      condition: `Khoản được đánh dấu bất thường và chiếm ≥ ${number(income)}% thu nhập tháng ước tính.`,
      example: `Thu nhập 18.000.000đ → từ ${number(18000000 * income / 100)}đ đáp ứng điều kiện.`
    },
    {
      code: 'LIMITED_HISTORY', label: 'Chưa đủ dữ liệu',
      meaning: 'Chưa có đủ lịch sử tham chiếu tin cậy để đánh giá khoản chi.',
      condition: `Dưới ${minimum} mẫu cùng danh mục, mốc so sánh không hợp lệ hoặc chưa đủ mẫu hợp lệ cho model.`,
      example: 'Danh mục có 7 khoản: chưa đánh giá cả khoản nhỏ lẫn khoản lớn, chờ thêm lịch sử.'
    },
  ];
}

const reasonLabels = new Map(getAnomalyReasonGuide().map(reason => [reason.code, reason.label]));
export function getAnomalyReasonLabel(code: string): string {
  return reasonLabels.get(code) ?? code;
}

