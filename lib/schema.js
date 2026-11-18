// Cấu trúc 6 bảng Lark Base đã chốt ngày 18/11/2026.
// type: 1 văn bản, 2 số, 3 chọn một, 4 chọn nhiều, 5 ngày, 7 ô tích
const T = { text: 1, number: 2, select: 3, multi: 4, date: 5, check: 7 };
const sel = (...names) => ({ type: T.select, property: { options: names.map((name) => ({ name })) } });
const multi = (...names) => ({ type: T.multi, property: { options: names.map((name) => ({ name })) } });

module.exports = {
  TABLES: {
    strategy: { name: 'Chiến lược Hai Rê', fields: [
      ['Mục tiêu', { type: T.text }], ['Sản phẩm ưu tiên', { type: T.text }], ['Khách hàng mục tiêu', { type: T.text }],
      ['Thông điệp chính', { type: T.text }], ['Điều không được làm', { type: T.text }], ['Kênh ưu tiên', { type: T.text }],
      ['Còn hiệu lực', { type: T.check }] ] },
    research: { name: 'Yêu cầu nghiên cứu', fields: [
      ['Chủ đề', { type: T.text }], ['Kênh cần quét', multi('Facebook Reels', 'TikTok')], ['Từ khóa', { type: T.text }],
      ['Kênh tham khảo', { type: T.text }], ['Ghi chú', { type: T.text }] ] },
    trends: { name: 'Xu hướng', fields: [
      ['Tên xu hướng', { type: T.text }], ['Đợt nghiên cứu', { type: T.text }], ['Ngày', { type: T.date }], ['Mã xu hướng', { type: T.text }],
      ['Nền tảng', { type: T.text }], ['Mức độ', { type: T.text }], ['Mô tả', { type: T.text }], ['Gợi ý cho Hai Rê', { type: T.text }],
      ['Mức khớp chiến lược', sel('Khớp cao', 'Khớp vừa', 'Khớp thấp')], ['Lý do khớp', { type: T.text }], ['Link video mẫu', { type: T.text }],
      ['Được chọn', { type: T.check }], ['Người chọn', { type: T.text }], ['Thời điểm chọn', { type: T.date }] ] },
    scripts: { name: 'Kịch bản (định hướng quay)', fields: [
      ['Tiêu đề', { type: T.text }], ['Mã xu hướng', { type: T.text }], ['Đợt nghiên cứu', { type: T.text }], ['Thời lượng', { type: T.text }],
      ['Ý chính', { type: T.text }], ['Chuẩn bị', { type: T.text }], ['Danh sách cảnh', { type: T.text }],
      ['Trạng thái', sel('Chờ quay', 'Đã quay')] ] },
    videos: { name: 'Video', fields: [
      ['Mã video', { type: T.text }], ['Tiêu đề kịch bản', { type: T.text }], ['Đợt nghiên cứu', { type: T.text }], ['Người quay', { type: T.text }],
      ['Cửa hàng', { type: T.text }], ['Thẻ video thô', { type: T.text }], ['Ghi âm', { type: T.text }], ['Nhạc nền', { type: T.text }],
      ['Hiệu ứng chung', { type: T.text }], ['Link video hoàn chỉnh', { type: T.text }],
      ['Trạng thái', sel('Đang nộp', 'Đang dựng', 'Chờ duyệt', 'Đã duyệt', 'Cần sửa', 'Lỗi')],
      ['Yêu cầu sửa', { type: T.text }], ['Ngày xong', { type: T.date }], ['Link đã đăng', { type: T.text }] ] },
    log: { name: 'Nhật ký hoạt động', fields: [
      ['Hành động', { type: T.text }], ['Thời điểm', { type: T.date }], ['Người làm', { type: T.text }],
      ['Đối tượng liên quan', { type: T.text }], ['Chi tiết', { type: T.text }] ] }
  }
};
