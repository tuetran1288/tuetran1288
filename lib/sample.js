// Dữ liệu mẫu: dùng khi chưa nối AI (chế độ demo). Khi chạy thật, AI thay bằng dữ liệu thật.
const TRENDS = [
  { id: 't1', name: 'Trước – Sau trong 15 giây', where: 'TikTok · Facebook Reels', heat: 'Đang tăng mạnh', fit: 'Khớp cao',
    what: 'Mở đầu bằng cảnh “trước” thật xấu, cắt nhanh sang cảnh “sau” thật đẹp. Người xem ở lại để chờ kết quả.',
    idea: 'Lốp mòn trơ gai vào xưởng, 15 giây sau xe lăn bánh với lốp mới.', why: 'Đúng thế mạnh thay lốp nhanh gọn của Hai Rê.', link: '' },
  { id: 't2', name: 'Góc nhìn người thợ', where: 'TikTok', heat: 'Đang tăng', fit: 'Khớp vừa',
    what: 'Quay từ đúng tầm mắt người làm nghề, như thể người xem đang tự tay làm việc đó.',
    idea: 'Gắn điện thoại ngang ngực thợ khi vá lốp hoặc thay nhớt.', why: 'Cho thấy tay nghề thợ, nhưng cần dụng cụ gắn máy.', link: '' },
  { id: 't3', name: 'Hỏi nhanh – đáp gọn', where: 'TikTok · Facebook Reels', heat: 'Đang tăng mạnh', fit: 'Khớp cao',
    what: 'Một câu khách hay thắc mắc hiện to trên màn hình, người trong nghề trả lời xong trong dưới 20 giây.',
    idea: 'Khách hỏi “Lốp bơm bao nhiêu ký là đủ?”, thợ chỉ cách xem tem áp suất trên xe.', why: 'Xây hình ảnh nơi hiểu xe, dễ quay tại cửa hàng.', link: '' },
  { id: 't4', name: 'Một ngày ở cửa hàng', where: 'Facebook Reels', heat: 'Ổn định', fit: 'Khớp vừa',
    what: 'Hậu trường đời thường, ghép nhiều cảnh ngắn theo nhạc. Tạo cảm giác gần gũi và đáng tin.',
    idea: 'Từ lúc mở cửa 170 Lê Duẩn đến chiếc xe cuối cùng trong ngày.', why: 'Tăng độ tin cậy, nhưng ít trực tiếp kéo khách.', link: '' },
  { id: 't5', name: 'Sai lầm thường gặp', where: 'TikTok · Facebook Reels', heat: 'Đang tăng mạnh', fit: 'Khớp cao',
    what: 'Đếm 3 lỗi mà nhiều người mắc. Người xem ở lại để kiểm tra mình có dính lỗi nào không.',
    idea: '3 thói quen làm lốp xe nhanh hỏng mà chủ xe ít để ý.', why: 'Kiến thức chuyên môn, kéo khách tới kiểm tra lốp.', link: '' },
  { id: 't6', name: 'Đoán xem cái nào tốt hơn', where: 'TikTok · Facebook Reels', heat: 'Đang tăng', fit: 'Khớp vừa',
    what: 'Đặt hai món cạnh nhau, người xem đoán cái nào tốt hơn rồi video giải thích đáp án.',
    idea: 'Đặt lốp mới cạnh lốp đã nứt hông, hỏi “Lốp nào còn chạy an toàn?”.', why: 'Giúp khách biết cách chọn lốp, cần so sánh trung thực.', link: '' }
];

const L = (role, shot, time, film, say, tip) => ({ role, shot, time, film, say, tip });
const SCRIPTS = {
  t1: { title: 'Lốp mòn “hồi sinh” trong 15 giây', length: '15 giây',
    goal: 'Cho khách thấy lốp mòn nguy hiểm thế nào và thay ở Hai Rê nhanh gọn ra sao.',
    prep: 'Một xe khách có lốp đã mòn tới vạch (xin phép chủ xe), bộ lốp mới, khu vực thay lốp gọn gàng, đủ sáng.',
    scenes: [
      L('Mở đầu gây chú ý', 'Cận cảnh', '0 – 3 giây', 'Mặt lốp mòn trơ gai, quay sát.', 'Chữ to: “Lốp thế này mà vẫn chạy trời mưa?”', 'Đưa máy thật gần, lia chậm dọc mặt lốp.'),
      L('Chỉ rõ vấn đề', 'Cận tay thợ', '3 – 6 giây', 'Thợ chỉ ngón tay vào vạch báo mòn trên lốp.', 'Thợ nói: “Gai mòn tới vạch này là phải thay.”', 'Giữ máy đứng yên, lấy nét vào đầu ngón tay.'),
      L('Thay lốp', 'Trung cảnh', '6 – 11 giây', 'Tháo lốp cũ, lắp lốp mới.', 'Không lời. AI sẽ tua nhanh và chèn nhạc.', 'Đặt máy cố định một chỗ, quay liền một mạch.'),
      L('Kết quả', 'Cận cảnh', '11 – 14 giây', 'Lốp mới gai sâu, rồi xe lăn bánh ra khỏi cửa hàng.', 'Chữ to: “Xong. An tâm chạy mưa.”', 'Quay cùng góc với cảnh 1 để thấy rõ khác biệt.'),
      L('Chốt cửa hàng', 'Toàn cảnh', '14 – 15 giây', 'Mặt tiền cửa hàng, thấy rõ biển hiệu.', 'Logo Hai Rê và địa chỉ. AI tự chèn.', 'Đứng bên kia đường, lấy trọn biển hiệu.')] },
  t3: { title: '“Lốp bơm bao nhiêu ký là đủ?”', length: '18 giây',
    goal: 'Trả lời một câu khách hay hỏi, để khách nhớ Hai Rê là nơi hiểu xe.',
    prep: 'Một nhân viên đóng vai khách, một thợ nói rõ ràng, đồng hồ đo áp suất, một xe có tem áp suất ở khung cửa.',
    scenes: [
      L('Câu hỏi', 'Trung cảnh', '0 – 2 giây', 'Khách đứng cạnh xe, quay sang hỏi thợ.', 'Khách hỏi: “Lốp bơm bao nhiêu ký là đủ anh?”', 'Quay ngang ngực, khách nhìn thẳng vào thợ.'),
      L('Trả lời', 'Cận cảnh', '2 – 8 giây', 'Thợ mở cửa ghế lái, chỉ vào tem áp suất.', 'Thợ nói: “Xe nào cũng có tem này, bơm đúng số trên tem.”', 'Lấy nét vào tem, tay thợ chỉ đúng con số.'),
      L('Chứng minh', 'Cận tay thợ', '8 – 15 giây', 'Thợ đo áp suất bằng đồng hồ rồi bơm thêm cho đủ.', 'Thợ nói: “Đo lúc lốp còn nguội là chuẩn nhất.”', 'Quay rõ mặt đồng hồ khi kim dừng.'),
      L('Chốt cửa hàng', 'Trung cảnh', '15 – 18 giây', 'Thợ nhìn vào máy, cười, đứng trước cửa hàng.', 'Thợ nói: “Ghé Hai Rê, thợ đo giúp.”', 'Đứng chỗ sáng, biển hiệu nằm phía sau lưng.')] },
  t5: { title: '3 thói quen đang phá lốp xe của anh chị', length: '25 giây',
    goal: 'Chỉ ra 3 lỗi phổ biến để người xem tự kiểm tra, rồi nhớ ghé cửa hàng.',
    prep: 'Một lốp nứt hông, một lốp phù hoặc rách hông, hai lốp mòn lệch để so sánh. Lấy từ lốp cũ khách đã thay.',
    scenes: [
      L('Mở đầu', 'Trung cảnh', '0 – 3 giây', 'Thợ cầm một chiếc lốp hỏng, nhìn thẳng vào máy.', 'Thợ nói: “3 thói quen này đang phá lốp xe anh chị.”', 'Nói nhanh, dứt khoát, không chào hỏi dài.'),
      L('Lỗi 1: lốp non hơi', 'Cận cảnh', '3 – 9 giây', 'Hông lốp bị nứt.', 'Chữ to: “1. Chạy lốp non hơi”.', 'Xoay lốp chậm để thấy rõ vết nứt.'),
      L('Lỗi 2: va đập mạnh', 'Cận cảnh', '9 – 15 giây', 'Lốp bị phù hoặc rách ở hông.', 'Chữ to: “2. Leo lề, cán ổ gà khi chạy nhanh”.', 'Chỉ ngón tay vào đúng chỗ phù.'),
      L('Lỗi 3: không đảo lốp', 'Cận cảnh', '15 – 21 giây', 'Hai lốp đặt cạnh nhau, một cái mòn lệch một bên.', 'Chữ to: “3. Không đảo lốp định kỳ”.', 'Đặt hai lốp sát nhau, quay từ trên xuống.'),
      L('Chốt cửa hàng', 'Trung cảnh', '21 – 25 giây', 'Thợ đứng trước cửa hàng.', 'Thợ nói: “Dính lỗi nào thì ghé Hai Rê kiểm tra.”', 'Biển hiệu nằm trong khung hình.')] }
};

// Khi xu hướng chưa có kịch bản mẫu riêng
function genericScript(t) {
  return { title: t.name, length: '20 giây', goal: t.idea, prep: 'Chuẩn bị đủ sáng, máy quay dọc, người quay nói rõ và chậm.',
    scenes: [
      L('Mở đầu gây chú ý', 'Cận cảnh', '0 – 3 giây', 'Cảnh mở đầu đáng chú ý nhất của xu hướng này.', 'Chữ to ngắn gọn nêu vấn đề.', 'Đưa máy sát, giữ chắc tay.'),
      L('Nội dung chính', 'Trung cảnh', '3 – 12 giây', t.idea, 'Người trong nghề nói ngắn, dưới 10 giây.', 'Quay ngang ngực, ánh sáng từ phía trước.'),
      L('Kết quả', 'Cận cảnh', '12 – 17 giây', 'Cảnh cho thấy kết quả rõ ràng.', 'Chữ to: kết quả.', 'Cùng góc với cảnh mở đầu.'),
      L('Chốt cửa hàng', 'Toàn cảnh', '17 – 20 giây', 'Mặt tiền cửa hàng, thấy rõ biển hiệu.', 'Logo Hai Rê và địa chỉ. AI tự chèn.', 'Đứng bên kia đường, lấy trọn biển hiệu.')] };
}

const PROMO_SCENES = [
  { num: 1, time: '0:00 – 0:03', name: 'Hook – Gây chú ý' }, { num: 2, time: '0:03 – 0:10', name: 'Vấn đề của khách' },
  { num: 3, time: '0:10 – 0:20', name: 'Giải pháp từ Hai Rê' }, { num: 4, time: '0:20 – 0:32', name: 'Ưu đãi và thời hạn' },
  { num: 5, time: '0:32 – 0:40', name: 'Bằng chứng, khách thật' }, { num: 6, time: '0:40 – 0:45', name: 'Kêu gọi đến cửa hàng' }
];

const BUILTIN_TEMPLATES = [
  { id: 'auto', tag: 'Mặc định', name: 'Để AI chọn theo xu hướng', size: 'Tự động', what: 'AI chọn khung phân cảnh hợp nhất với từng xu hướng đã chọn.', scenes: 'Mỗi xu hướng một khung riêng.' },
  { id: 'ugc', tag: 'Tuyến cố định', name: 'Review chân thực (UGC)', size: '15–30 giây · 4 phân cảnh', what: 'Khách hoặc nhân viên kể thật về trải nghiệm, quay như tự điện thoại quay.', scenes: 'Mở đầu · Trải nghiệm · Kết quả · Kêu gọi' },
  { id: 'bts', tag: 'Tuyến cố định', name: 'Hậu trường doanh nghiệp', size: '20–40 giây · 5 phân cảnh', what: 'Cho khách thấy thợ làm việc, kho lốp và quy trình trong cửa hàng.', scenes: 'Mở cửa · Kho hàng · Thợ làm · Khách nhận xe · Chốt' },
  { id: 'edu', tag: 'Tuyến cố định', name: 'Kiến thức chuyên môn', size: '20–30 giây · 4 phân cảnh', what: 'Một mẹo ngắn về lốp, nhớt hoặc bình điện, xem xong dùng được ngay.', scenes: 'Câu hỏi · Mẹo · Chứng minh · Kêu gọi' }
];

module.exports = { TRENDS, SCRIPTS, genericScript, PROMO_SCENES, BUILTIN_TEMPLATES };
