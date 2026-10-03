# Brief thiết kế màn hình app đi chợ (bản chốt 2026-10-02)

Dán toàn bộ file này vào Claude Design, đính kèm mon-an.json.

## Bối cảnh
- App chỉ cài trên iPhone của Yến (vợ). Huy không mở app, chỉ nhận tin Telegram.
- Ngày đi chợ: thứ 3 chọn cho 2 ngày, thứ 5 chọn cho 2 ngày, thứ 7 chọn cho 3 ngày (thứ 7, CN, thứ 2). Mỗi ngày 1 món mặn + 1 món rau.
- 16:00 mỗi ngày app gửi thông báo cho Yến. Ngày đi chợ: "Chọn món cho đợt này nhé!". Ngày khác: "Hôm nay ăn: [món mặn] + [món rau]".
- Ảnh món dùng ảnh tạm (khung màu có tên món), ảnh thật sẽ thay sau.

## Phong cách
- Gần giống game xếp kẹo, vui và gần gũi: màu kẹo tươi (hồng, cam, tím, xanh ngọc), nút bo tròn có bóng nổi, bấm vào thì nảy nhẹ. Lấy cảm hứng chứ không sao chép logo hay nhân vật của Candy Crush.
- Font hoạt hình nét đậm, phải hiện đúng dấu tiếng Việt. Chữ thân ≥16 pt, tên món ≥18 pt.
- Âm thanh lấy từ thư viện hiệu ứng miễn phí (ví dụ Pixabay, Mixkit): tiếng "pop" khi chọn món, tiếng "ting" khi chốt. Có nút tắt tiếng.
- Kích thước màn hình: iPhone 14 (390×844 pt).

## Màn hình
1. **Chào**: dòng chữ to "Vợ đi làm mệt không, hôm nay muốn ăn gì thế?" và nút "Chọn món thôi".
2. **Chọn món** (lặp lại cho mỗi ngày):
   - Trên cùng: "Ngày 1/2 · Thứ 3" (đợt thứ 7 là 1/3).
   - Hai nhóm "Món mặn (10)" và "Món rau (10)", mỗi nhóm là lưới 2 cột: thẻ ảnh vuông, tên món, số phút nấu.
   - Chọn 1 món mặn: 9 món mặn còn lại bị phủ mờ, không bấm được. Món đã chọn có viền sáng và nút ✕ nhỏ ở góc thẻ; bấm ✕ thì bỏ chọn và mở lại cả nhóm mặn. Nhóm rau làm y như vậy, độc lập với nhóm mặn.
   - Món đã ăn hoặc đã chọn trong 3 ngày gần nhất bị phủ mờ và có nhãn "Vừa ăn".
   - Nút chữ nhật dưới cùng "Chốt nhé": mờ khi chưa đủ 1 mặn + 1 rau, sáng lên khi đủ. Bấm thì sang ngày tiếp theo.
3. **Xác nhận**: danh sách từng ngày với 2 món và ảnh nhỏ. Hai nút "Chốt luôn" và "Khoan đã". "Khoan đã" xóa hết lựa chọn và quay lại ngày 1 từ đầu.
4. **Đã gửi**: "Đã gửi cho Huy rồi nhé!" kèm hiệu ứng kẹo nổ, nút "Đổi món".
5. **Đổi món**: chọn một ngày trong đợt, thay món mặn hoặc món rau đã chọn. Sau khi đổi, gửi lại tin Telegram có ghi "(đã đổi)".
6. **Hôm nay ăn gì**: mở từ thông báo 16:00 ngày không đi chợ. Hiện 2 thẻ món lớn của hôm nay.

## Tin nhắn Telegram (thiết kế mẫu chữ)
Khi Yến bấm "Chốt luôn" (hoặc khi app tự chọn), app gửi:
- **Yến (1 tin)**: món đã chốt từng ngày, ví dụ "Thứ 3: Thịt kho trứng + Canh cà chua trứng".
- **Huy (3 tin, theo thứ tự)**:
  1. Cùng nội dung tin gửi Yến.
  2. Nguyên liệu đi chợ cả đợt: tên tiếng Nhật, gộp trùng, nhóm theo quầy, chỉ ghi tên.
  3. Cách nấu các món trong đợt (lấy từ cach-nau.md). Telegram giới hạn 4096 ký tự mỗi tin; nếu dài hơn (đợt thứ 7 có 6 món) thì tự tách thành nhiều tin, mỗi tin trọn vẹn một món.

## Luật chạy ngầm (không có màn hình riêng)
- 16:30 mà Yến chưa chốt: app tự chọn ngẫu nhiên 1 mặn + 1 rau mỗi ngày, không lặp món trong 3 ngày gần nhất, rồi gửi Telegram như trên, có ghi "(app tự chọn)".

## Ngoài phạm vi bản này
Quản lý danh sách món: Huy sửa trong Claude khi cần, ở bản nâng cấp sau.

## Xong khi
1. Có bản mẫu bấm thử được của 6 màn hình trên, cùng mẫu chữ của 4 tin Telegram.
2. Huy kiểm tra và bấm thử hết luồng: chọn 2 ngày, bỏ chọn bằng ✕, "Khoan đã", "Chốt luôn", "Đổi món".
3. Tên món, nhóm mặn/rau và số phút lấy đúng từ mon-an.json (20 món).
4. Tiếng Việt hiện đúng dấu ở mọi chỗ.
