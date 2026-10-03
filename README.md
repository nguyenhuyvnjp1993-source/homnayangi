# Mình ăn gì thế, Vợ ơi

App đi chợ cho Yến (PWA trên iPhone): bấm ảnh chọn món, Huy nhận danh sách đi chợ và cách nấu qua Telegram.
Luật nghiệp vụ: `docs/brief.md`. Thiết kế: `docs/brief-thiet-ke.md` và thư mục `design/`.

## Tiến độ
- [x] **C1** – App tĩnh trên Netlify, 6 màn hình theo design, dữ liệu từ `data/mon-an.json`. Chưa lưu, chưa gửi.
- [x] **C2** – Lưu vào Supabase, "Vừa ăn" đọc lịch sử thật.
- [x] **C3** – Bot Telegram gửi 4 tin, "Đổi món" gửi lại.
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
| `netlify/functions/bua-an.mjs` | Code máy chủ: giữ khóa Supabase, ghi/đọc bảng `bua_an`, lưu xong thì gửi Telegram (địa chỉ `/api/bua-an`) |
| `netlify/lib/telegram.mjs` | Soạn 4 tin Telegram (thực đơn, đi chợ, cách nấu) và gửi |
| `netlify/functions/telegram-id.mjs` | Trang `/api/telegram-id` để lấy mã chat; tự tắt khi đã cài đủ mã |
| `docs/cach-nau.md` | Cách nấu 20 món – tin số 3 của Huy lấy nguyên văn từ đây (mỗi món bắt đầu bằng `### M1. ...`) |
| `supabase/bang.sql` | Lệnh tạo bảng `bua_an`, dán vào Supabase → SQL Editor |

## Đưa lên Netlify (làm một lần)
1. Vào https://app.netlify.com, đăng nhập bằng GitHub.
2. **Add new site → Import an existing project → GitHub**, chọn repo `homnayangi`.
3. Ở mục **Branch to deploy** chọn nhánh muốn chạy (nhánh `main` sau khi gộp code). Các ô Build command và Publish directory để nguyên: Netlify tự đọc `netlify.toml`.
4. Bấm **Deploy**. Xong sẽ có địa chỉ dạng `https://ten-gi-do.netlify.app`. Có thể đổi tên ở **Site configuration → Change site name**.
5. Từ đó mỗi lần code mới được gộp vào nhánh đó, Netlify tự cập nhật.

## Nối Supabase (làm một lần, chặng C2)
1. Supabase → **SQL Editor** → **New query** → dán toàn bộ `supabase/bang.sql` → **Run**. Vào **Table Editor** thấy bảng `bua_an` là được.
2. Supabase → **Project Settings → API Keys** → mục **Secret keys** → bấm hiện và **Copy** khóa (bắt đầu bằng `sb_secret_`).
3. Netlify → site `homnayangivooi` → **Site configuration → Environment variables → Add a variable**, thêm 2 biến:
   - `SUPABASE_URL` = địa chỉ dự án, dạng `https://xxxx.supabase.co`
   - `SUPABASE_SECRET_KEY` = khóa vừa copy (đánh dấu **Contains secret values**)
4. Netlify → **Deploys → Trigger deploy → Deploy site** để bản đang chạy nhận 2 biến mới.

Bảng `bua_an`: mỗi ngày một dòng (`ngay`, `man`, `rau`, `nguon`, `da_doi`, `cap_nhat`). Muốn xóa dữ liệu thử: Table Editor → chọn dòng → Delete.

## Nối bot Telegram (làm một lần, chặng C3)
1. Telegram → tìm **@BotFather** → gửi `/newbot` → đặt tên hiển thị, rồi tên bot (phải kết thúc bằng `bot`). BotFather trả về token dạng `123456:ABC...`.
2. Netlify → **Environment variables** → thêm `TELEGRAM_BOT_TOKEN` = token đó (đánh dấu **Contains secret values**) → **Deploys → Trigger deploy → Deploy project**.
3. Huy và Yến mỗi người mở bot (link `t.me/<tên bot>`) và bấm **Start**.
4. Mở `https://homnayangivooi.netlify.app/api/telegram-id` → thấy bảng tên và mã chat.
5. Netlify → thêm `TELEGRAM_CHAT_HUY` = mã của Huy, `TELEGRAM_CHAT_YEN` = mã của Yến → Trigger deploy. Trang `/api/telegram-id` từ đây tự tắt.
   Chưa có mã của Yến cũng được: Huy vẫn nhận đủ 3 tin, chỉ thiếu tin của Yến. Thêm `TELEGRAM_CHAT_YEN` sau rồi Trigger deploy.

Khi gửi: Yến bấm "Chốt luôn" → Yến 1 tin (ảnh logo + thực đơn), Huy 3 tin (thực đơn, đi chợ, cách nấu). "Gửi lại cho Huy" sau khi đổi món gửi lại cả 4 tin, có ghi "(đã đổi)".

## Kiểm trên iPhone
- Mở địa chỉ Netlify bằng **Safari**.
- App tự chọn màn theo thứ trong tuần (giờ Nhật): Thứ 3, 5, 7 vào màn Chào để chọn món; ngày khác vào "Hôm nay ăn gì".
- Link thử từng đợt bất kỳ ngày nào: thêm `?dot=thu3`, `?dot=thu5` hoặc `?dot=thu7` vào cuối địa chỉ. Xem màn "Hôm nay ăn gì": thêm `?xem=homnay`.
- Lưu ý: link thử `?dot=` lưu thật vào ngày có thứ đó gần nhất (hôm nay hoặc sắp tới) và **gửi Telegram thật**. Món thật của ngày đó sẽ ghi đè lên.
- Đã chốt đợt rồi mà mở lại app (cùng ngày) thì app vào thẳng màn "Đã gửi" để đổi món.
- Cài như app: nút Chia sẻ → **Thêm vào MH chính**.

## Giới hạn hiện tại (sẽ làm ở chặng sau)
- Chưa có thông báo 16:00, nhắc 16:15, tự chọn 16:30 (C4).
- Ảnh món là khung màu tạm; ảnh nền từng màn trong design chưa có.

## Hỏng thì xem ở đâu
- App báo "Chưa tải được dữ liệu":
  - nếu kèm chữ `Chưa cài SUPABASE_URL...`: thiếu biến trong Netlify (mục "Nối Supabase" bước 3–4);
  - nếu kèm `khóa công khai (publishable/anon)` hoặc `row-level security`: đã dán nhầm khóa Publishable/anon, thay bằng khóa **Secret** (`sb_secret_...`) hoặc **service_role**, rồi Trigger deploy;
  - nếu kèm `Supabase 401/403`: khóa sai, copy lại khóa secret;
  - nếu kèm `relation ... bua_an does not exist`: chưa chạy `supabase/bang.sql`;
  - nếu kèm `Unexpected token` hoặc lỗi JSON: `data/mon-an.json` sai dấu phẩy/ngoặc.
- Màn "Đã gửi" báo "Đã lưu món rồi nhé! Nhưng Telegram chưa gửi được":
  - `Chưa cài TELEGRAM_...`: thiếu token hoặc mã chat của Huy trong Netlify (mục "Nối bot Telegram");
  - `Unauthorized`: token bot sai;
  - `chat not found` hoặc `bot was blocked`: mã chat sai, hoặc người đó chưa bấm Start / đã chặn bot.
  Sửa xong bấm **Gửi lại Telegram** (món đã lưu, không cần chọn lại).
- Tin cách nấu sai nội dung: sửa `docs/cach-nau.md` (giữ dạng `### M1. Tên món (phút)` cho mỗi món).
- Xem lỗi máy chủ chi tiết: Netlify → **Logs → Functions → bua-an**.
- Sai luật chọn món, chữ trên màn hình: `js/app.js`.
- Sai màu, cỡ chữ, khoảng cách: `css/app.css`.
