# Mình ăn gì thế, Vợ ơi

App đi chợ cho Yến (PWA trên iPhone): bấm ảnh chọn món, Huy nhận danh sách đi chợ và cách nấu qua Telegram.
Luật nghiệp vụ: `docs/brief.md`. Thiết kế: `docs/brief-thiet-ke.md` và thư mục `design/`.

## Tiến độ
- [x] **C1** – App tĩnh trên Netlify, 6 màn hình theo design, dữ liệu từ `data/mon-an.json`. Chưa lưu, chưa gửi.
- [ ] C2 – Lưu vào Supabase, "Vừa ăn" đọc lịch sử thật.
- [ ] C3 – Bot Telegram gửi 4 tin, "Đổi món" gửi lại.
- [ ] C4 – Thông báo 16:00, nhắc 16:15, tự chọn 16:30.
- [ ] C5 – Logo, âm thanh, ảnh món thật.

## Các file của app
| File | Làm gì |
| --- | --- |
| `index.html` | Khung app |
| `js/app.js` | Toàn bộ logic: 6 màn hình, luật chọn món, âm thanh, hiệu ứng |
| `css/app.css` | Màu, font, kích thước (lấy từ `design/ds/tokens.css`) |
| `data/mon-an.json` | 20 món – nguồn dữ liệu duy nhất. Sửa file này là app đổi theo |
| `manifest.webmanifest`, `icons/` | Để "Thêm vào màn hình chính" trên iPhone có tên và icon |
| `netlify.toml` | Cài đặt Netlify (không có bước build) |

## Đưa lên Netlify (làm một lần)
1. Vào https://app.netlify.com, đăng nhập bằng GitHub.
2. **Add new site → Import an existing project → GitHub**, chọn repo `homnayangi`.
3. Ở mục **Branch to deploy** chọn nhánh muốn chạy (nhánh `main` sau khi gộp code). Các ô Build command và Publish directory để nguyên: Netlify tự đọc `netlify.toml`.
4. Bấm **Deploy**. Xong sẽ có địa chỉ dạng `https://ten-gi-do.netlify.app`. Có thể đổi tên ở **Site configuration → Change site name**.
5. Từ đó mỗi lần code mới được gộp vào nhánh đó, Netlify tự cập nhật.

## Kiểm trên iPhone
- Mở địa chỉ Netlify bằng **Safari**.
- App tự chọn màn theo thứ trong tuần (giờ Nhật): Thứ 3, 5, 7 vào màn Chào để chọn món; ngày khác vào "Hôm nay ăn gì".
- Link thử từng đợt bất kỳ ngày nào: thêm `?dot=thu3`, `?dot=thu5` hoặc `?dot=thu7` vào cuối địa chỉ. Xem màn "Hôm nay ăn gì": thêm `?xem=homnay`.
- Cài như app: nút Chia sẻ → **Thêm vào MH chính**.

## Giới hạn của C1 (sẽ làm ở chặng sau)
- Chưa lưu gì: đóng app là mất lựa chọn.
- "Vừa ăn" mới tính giữa các ngày trong cùng đợt; lịch sử thật ở C2.
- "Chốt luôn" / "Gửi lại cho Huy" chỉ chuyển màn, chưa gửi Telegram (C3).
- "Hôm nay ăn gì" đang hiện 2 món mẫu.
- Ảnh món là khung màu tạm; ảnh nền từng màn trong design chưa có.

## Hỏng thì xem ở đâu
- App trắng hoặc báo "Không tải được danh sách món": kiểm `data/mon-an.json` có sai dấu phẩy/ngoặc không.
- Sai luật chọn món, chữ trên màn hình: `js/app.js`.
- Sai màu, cỡ chữ, khoảng cách: `css/app.css`.
