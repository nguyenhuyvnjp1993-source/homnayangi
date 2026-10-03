# App đi chợ "Mình ăn gì thế, Vợ ơi"

## Người dùng và cách làm việc
- Chủ dự án: Huy (kỹ sư BIM, không biết lập trình). Huy giao việc và nghiệm thu, Claude viết code.
- Trả lời bằng tiếng Việt. Giữ nguyên tên nguyên liệu tiếng Nhật.
- Mỗi phiên làm MỘT chặng (xem docs/brief.md và mục "Chặng" bên dưới). Lên kế hoạch trước, chờ Huy duyệt rồi mới viết code.
- Trước khi báo xong: tự chạy thử, rồi chỉ cho Huy cách kiểm trên iPhone thật.
- Xong mỗi chặng: giải thích lại trong 3–5 câu (đã làm gì, file nào, hỏng thì xem ở đâu) và cập nhật README.md.
- Không tự thêm tính năng ngoài brief.

## Bảo mật
- Không bao giờ đưa token bot Telegram, khóa Supabase hay mã bí mật nào vào code hoặc commit.
- Không yêu cầu Huy dán mã bí mật vào chat. Chỉ cho Huy chỗ dán trong trang cài đặt Netlify hoặc Supabase.

## Tài liệu nguồn
- docs/brief.md: luật nghiệp vụ (lịch đi chợ, 16:00/16:15/16:30, không lặp món 3 ngày, Telegram).
- docs/brief-thiet-ke.md: 6 màn hình và tin Telegram.
- data/mon-an.json: 20 món (id, tên, mặn/rau, nguyên liệu, số phút). Đây là nguồn dữ liệu duy nhất cho món ăn.
- docs/cach-nau.md: công thức, dùng cho tin Telegram số 3 của Huy (mỗi tin ≤ 4096 ký tự, tách theo từng món).
- design/: file gốc xuất từ Claude Design. Main.dc.html chứa toàn bộ luồng 6 màn hình và logic chọn món; Telegram.dc.html chứa mẫu 4 tin và cách tách tin. Màu, font, kích thước lấy từ design/ds/tokens.json. Đây là bản tham chiếu, không chạy trực tiếp được (thiếu runtime của Claude Design).
- assets/: logo app và âm thanh (Huy bổ sung). Ảnh món chưa có, dùng khung màu tạm.

## Kiến trúc đã chốt
- PWA chỉ cài trên iPhone của Yến (iOS 16.4+), host trên Netlify, code trên GitHub.
- Supabase: bảng lưu lựa chọn và lịch sử, pg_cron hẹn giờ (16:00 JST = 07:00 UTC), Edge Function gửi Telegram và tự chọn món. Token bot cất trong Supabase secrets.
- Telegram: Yến nhận 1 tin, Huy nhận 3 tin (món, đi chợ, cách nấu).

## Chặng
- C1: App tĩnh trên Netlify, 6 màn hình theo design, dữ liệu từ data/mon-an.json. Chưa lưu, chưa gửi.
- C2: Lưu vào Supabase, "Vừa ăn" đọc lịch sử thật.
- C3: Bot Telegram gửi 4 tin, "Đổi món" gửi lại.
- C4: Thông báo 16:00, nhắc 16:15, tự chọn 16:30, nút "chạy thử giờ" chỉ Huy dùng.
- C5: Logo, âm thanh, ảnh món thật, README hoàn chỉnh.
