# Brief app đi chợ (bản chốt 2026-10-02, cập nhật hướng Telegram)

## Mục tiêu
Giảm thời gian bàn bạc bữa tối: vợ chọn món bằng cách bấm vào ảnh, Huy nhận danh sách đi chợ và cách nấu.

## Người dùng
App dạng PWA, chỉ cài trên iPhone của Yến (vợ). Huy không dùng app, chỉ nhận tin Telegram.

## Telegram (chốt 2026-10-02)
Khi Yến chốt món: Yến nhận 1 tin (món từng ngày). Huy nhận 3 tin: món từng ngày, nguyên liệu đi chợ, cách nấu. 16:00 mỗi ngày app gửi thông báo đẩy cho Yến (Huy chốt 2026-10-02); nếu thông báo đẩy trên iPhone không ổn định thì dự phòng bằng bot Telegram.

## Lịch
| Ngày | 16:00 thông báo | Việc |
| --- | --- | --- |
| Thứ 3 | Có | Vợ chọn món cho thứ 3 + thứ 4 (2 ngày × 2 món = 4 món) |
| Thứ 5 | Có | Vợ chọn món cho thứ 5 + thứ 6 (4 món) |
| Thứ 7 | Có | Vợ chọn món cho thứ 7 + CN + thứ 2 (3 ngày × 2 món = 6 món) |
| Thứ 4, 6, CN, 2 | Có | Chỉ nhắc 2 món đã chọn cho hôm nay |

## Luồng ngày đi chợ (thứ 3, 5, 7)
1. 16:00 (giờ Nhật) máy Yến nhận thông báo của app.
2. Vợ mở app, thấy khoảng 20 món kèm ảnh, bấm ảnh để chọn 2 món cho mỗi ngày: 1 món mặn + 1 món rau.
3. Chọn xong, Telegram của Huy nhận món, danh sách nguyên liệu cả đợt (gộp trùng, chỉ ghi tên) và cách nấu; Telegram của Yến nhận món.
4. Quá 30 phút (16:30) vợ chưa chọn: app tự chọn ngẫu nhiên (vẫn 1 mặn + 1 rau), không lặp món đã ăn trong 3 ngày gần nhất, rồi gửi Telegram cho Yến và Huy.

## Màn hình
Xem brief-thiet-ke.md (Chào, Chọn món, Xác nhận, Đã gửi, Đổi món). Danh sách đi chợ và cách nấu chuyển sang tin Telegram của Huy. Quản lý món: Huy sửa mon-an.json qua Claude.

## Dữ liệu
- 20 món: Huy tự chọn từ danh sách trên mạng, phù hợp với chợ đang đi.
- Ảnh: AI tạo, giống ảnh thật.
- Cách nấu: Claude viết sau khi Huy chốt món và nguyên liệu, cho người không giỏi nấu: ít bước, dụng cụ thông thường, không kỹ thuật khó.

## Không làm ở bản đầu
Giá cả, tồn kho tủ lạnh, số lượng nguyên liệu.

## Xong khi
3 ngày liên tiếp: 16:00 Yến nhận thông báo của app, chọn món trên app (hoặc tự chọn sau 30 phút); Yến nhận 1 tin món đã chốt, Huy nhận đủ 3 tin (món, nguyên liệu, cách nấu) đúng nội dung.

## Khi Yến không mở app (chốt 2026-10-02)
- 16:00 thông báo app. 16:15 chưa chốt: nhắc lần 2 bằng thông báo app + tin Telegram cho Yến kèm link. 16:30 chưa chốt: máy chủ tự chọn (1 mặn + 1 rau mỗi ngày, không lặp 3 ngày), gửi Telegram ghi "(app tự chọn)". Sau đó Yến vẫn "Đổi món" được, tin gửi lại ghi "(đã đổi)".
- Máy chủ: Supabase bản miễn phí (cơ sở dữ liệu lưu lịch sử món + pg_cron hẹn giờ + Edge Function chạy code, giữ bot token). App đặt trên Netlify.
- Cần kiểm ở bước code: dự án miễn phí có bị tạm dừng khi ít hoạt động không; giờ UTC (16:00 JST = 07:00 UTC); Yến bấm /start với bot một lần.
