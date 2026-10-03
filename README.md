# Mình ăn gì thế, Vợ ơi

App đi chợ cho nhà mình. Yến chọn món trên iPhone bằng cách bấm vào ảnh. Huy nhận thực đơn, danh sách đi chợ và cách nấu qua Telegram.
Luật nghiệp vụ: `docs/brief.md`. Thiết kế: `docs/brief-thiet-ke.md` và thư mục `design/`.

App: https://homnayangivooi.netlify.app

## Tiến độ
- [x] **C1** – App tĩnh trên Netlify, 6 màn hình theo design, dữ liệu từ `data/mon-an.json`.
- [x] **C2** – Lưu vào Supabase, "Vừa ăn" đọc lịch sử thật.
- [x] **C3** – Bot Telegram gửi 4 tin, "Đổi món" gửi lại.
- [x] **C4** – Thông báo 16:00, nhắc 16:15, tự chọn 16:30, trang chạy thử giờ.
- [x] **C5** – 20 ảnh món thật, 6 ảnh nền xáo mỗi lần mở app, 10 phút không dùng thì mở lại từ đầu, README hoàn chỉnh.

**Việc còn treo:**
- [ ] Yến bấm Start với bot, sau đó thêm biến `TELEGRAM_CHAT_YEN`.
- [ ] Trên iPhone của Yến: Thêm vào MH chính → Bật thông báo → thử bằng trang chạy thử.

## Mỗi ngày app chạy thế nào
| Giờ (Nhật) | Ngày đi chợ: thứ 3 (chọn 2 ngày), thứ 5 (2 ngày), thứ 7 (3 ngày: T7, CN, T2) | Ngày khác |
| --- | --- | --- |
| 16:00 | Thông báo cho Yến: "Chọn món cho đợt này nhé!" | Thông báo: "Hôm nay ăn: A + B" |
| Yến chọn | Mỗi ngày 1 mặn + 1 rau. Món đã ăn trong 3 ngày gần nhất bị mờ và có nhãn "Vừa ăn". Bấm "Chốt luôn" thì lưu món, Yến nhận 1 tin, Huy nhận 3 tin | — |
| 16:15 | Chưa chốt: nhắc lần 2 (thông báo + tin Telegram cho Yến kèm link) | — |
| 16:30 | Chưa chốt: app tự chọn (không lặp 3 ngày), lưu, gửi 4 tin ghi "(app tự chọn)" | — |
| Sau đó | Yến vẫn "Đổi món" được. Tin gửi lại ghi "(đã đổi)" | — |

**Mở app:** luôn vào màn 1 (Chào). Bấm "Chọn món thôi":
- Đợt hiện tại chưa chốt: vào màn chọn món.
- Đã chốt rồi (Yến chọn hoặc app tự chọn): sang màn "Đã gửi cho Huy rồi nhé!", vẫn bấm Đổi món được.

**Đợt mới bắt đầu lúc 1:00 sáng thứ 3, thứ 5, thứ 7.** Từ lúc đó app về lại bước chọn món cho đợt mới. Ví dụ: thứ 4 vẫn là đợt thứ 3; 0:30 sáng thứ 3 vẫn là đợt thứ 7 trước đó.

Riêng thông báo 16:00 ngày thường thì mở thẳng màn "Hôm nay ăn gì". Mỗi lần mở app, 6 ảnh nền được xáo ngẫu nhiên cho 6 màn hình.

**10 phút không dùng = đóng app:** Yến không chạm vào app 10 phút (đang mở hoặc chạy nền), thì lần chạm hoặc mở tiếp theo, app tải lại từ đầu như vừa mở mới. Ảnh nền được xáo lại, lựa chọn chưa chốt bị bỏ. Món đã chốt vẫn còn, vì đã lưu trong Supabase.

## Tin Telegram
| Tin | Gửi ai | Nội dung |
| --- | --- | --- |
| 1 | Yến + Huy | Ảnh logo + thực đơn từng ngày |
| 2 | Huy | Nguyên liệu đi chợ: tên Nhật, gộp trùng, theo quầy |
| 3 | Huy | Cách nấu (từ `docs/cach-nau.md`). Dài hơn 4096 ký tự thì tự tách thành nhiều tin, mỗi tin trọn món |

Chưa có `TELEGRAM_CHAT_YEN` thì Huy vẫn nhận đủ 3 tin, chỉ bỏ qua tin của Yến.

## Các biến cần cài trong Netlify
Netlify → site `homnayangivooi` → **Site configuration → Environment variables**. Sau khi thêm hoặc sửa biến, phải vào **Deploys → Trigger deploy → Deploy project**.

| Biến | Lấy ở đâu | Bí mật? |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase → Project Overview (dạng `https://xxxx.supabase.co`) | Không |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → **Secret keys** (`sb_secret_...`) | **Có** |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → `/newbot` | **Có** |
| `TELEGRAM_CHAT_HUY` | Trang `/api/telegram-id` (sau khi Huy bấm Start với bot) | Không |
| `TELEGRAM_CHAT_YEN` | Trang `/api/telegram-id` (sau khi Yến bấm Start với bot) | Không |
| `VAPID_PUBLIC_KEY` | Trang `/api/tao-khoa-thong-bao` | Không |
| `VAPID_PRIVATE_KEY` | Trang `/api/tao-khoa-thong-bao` (cùng một lần mở với khóa public) | **Có** |
| `HEN_GIO_MA` | Huy tự đặt, dùng cho trang chạy thử | **Có** |

Biến bí mật: tích **Contains secret values**. Không bao giờ dán các giá trị này vào chat hay vào code.

## Cài đặt lần đầu (đã làm, ghi lại để tham khảo)
1. **Netlify:** Add new site → Import from GitHub → repo `homnayangi`, nhánh `main`. Các ô khác để nguyên, Netlify tự đọc `netlify.toml`.
2. **Supabase:** SQL Editor → chạy `supabase/bang.sql`, rồi chạy `supabase/thong-bao.sql`.
3. **Bot Telegram:** tạo bot, Huy và Yến bấm **Start**, lấy mã chat ở `/api/telegram-id`. Trang này tự tắt khi đã cài đủ mã của 2 người.
4. **Thông báo:** lấy khóa ở `/api/tao-khoa-thong-bao`. Trang này tự tắt khi đã cài khóa.
5. **iPhone của Yến:** Safari → mở app → Chia sẻ → **Thêm vào MH chính** → mở app từ màn hình chính → bấm **🔔 Bật thông báo 16:00** → Cho phép.

## Sửa món, ảnh, âm thanh
### Sửa món
- **Tên món, nhóm mặn/rau, nguyên liệu:** sửa trong `data/mon-an.json`. App và tin Telegram tự đổi theo.
- **Cách nấu:** sửa trong `docs/cach-nau.md`. Giữ dòng tiêu đề mỗi món đúng dạng `### M1. Tên món (40 phút)`.
- **Nguyên liệu mới chưa có trong danh sách quầy:** sẽ nằm ở nhóm 【その他】. Muốn xếp vào đúng quầy thì nhờ Claude thêm vào `netlify/lib/telegram.mjs`.

### Thêm, đổi ảnh và âm thanh
1. Tải ảnh lên GitHub: vào repo → mở thư mục → **Add file → Upload files**.
   - **Ảnh nền:** cho vào `assets/nen/`, tên gì cũng được. Nên có 6 ảnh. App xáo thứ tự mỗi lần mở.
   - **Ảnh món:** cho vào `assets/mon/`, đặt tên đúng mã món (`M1.jpg`, `R4.png`…). Câu lệnh tạo ảnh có sẵn trong `docs/prompt-anh-mon.md`.
   - **Âm thanh:** `assets/pop.mp3` (khi chọn món), `assets/ting.mp3` (khi chốt). Không có thì app dùng âm tạo bằng code.
   - **Nhạc nền:** `assets/nhac-nen.mp3` (đúng tên này). Tải lên là app dùng luôn, **không cần nhờ Claude**. Chạm vào app lần đầu thì phát một lần (không lặp), tới khi hết bài hoặc đóng app. 15 giây đầu âm lượng tăng dần từ nhỏ tới đủ. Gửi cho Huy xong nhạc vẫn phát tiếp. Nút loa tắt/bật cả nhạc. Ra màn hình chính thì tạm dừng, mở lại app thì phát tiếp. Muốn đổi bài: tải file mới cùng tên đè lên.
2. Nhờ Claude chạy `tools/xu-ly-anh.sh`. Script này nén ảnh vào `img/` và cập nhật `data/tai-nguyen.json`.
3. Món nào chưa có ảnh vẫn hiện khung màu. Không cần đủ 20 ảnh một lúc.

### Đổi logo
Thay `assets/logo.png` (ảnh vuông), rồi nhờ Claude tạo lại các icon trong `icons/`.

## Kiểm tra
- **Thử từng đợt bất kỳ ngày nào:** thêm `?dot=thu3`, `?dot=thu5` hoặc `?dot=thu7` vào cuối địa chỉ app. Link này **lưu thật** vào ngày có thứ đó gần nhất, và **gửi Telegram thật**.
- **Xem màn "Hôm nay ăn gì":** thêm `?xem=homnay`.
- **Chạy thử giờ (chỉ Huy):** mở `/chay-thu.html`, nhập mã `HEN_GIO_MA`, chọn đợt, rồi bấm 16:00 / 16:15 / 16:30. Nút 16:30 chạy thật: tự chọn, lưu và gửi Telegram.
- **Xóa dữ liệu thử:** Supabase → Table Editor → `bua_an` → chọn dòng → Delete.

## Hỏng thì xem ở đâu
| Hiện tượng | Nguyên nhân / cách sửa |
| --- | --- |
| Link app báo "Page not found" | Code chưa gộp vào `main`, hoặc Netlify đang chạy nhánh khác |
| "Chưa tải được dữ liệu… `Chưa cài SUPABASE_URL`" | Thiếu biến Supabase trong Netlify |
| "…`khóa công khai`" hoặc "…`row-level security`" | Dán nhầm khóa Publishable/anon. Thay bằng khóa **Secret** |
| "…`relation … does not exist`" | Chưa chạy file SQL trong `supabase/` |
| "…`Unexpected token`" | `data/mon-an.json` sai dấu phẩy hoặc ngoặc |
| "Đã lưu món rồi nhé! Nhưng Telegram chưa gửi được…" | `Chưa cài TELEGRAM_…`: thiếu token hoặc mã chat của Huy. `Unauthorized`: token sai. `chat not found`: mã chat sai, hoặc người đó chưa bấm Start. Sửa xong bấm **Gửi lại Telegram** |
| Không nhận thông báo 16:00 | Bấm 16:00 ở `/chay-thu.html` để xem lý do. iPhone phải mở app từ màn hình chính, và Cài đặt → Thông báo → Vợ ơi phải đang bật |
| Hẹn giờ không chạy | Netlify → **Logs → Functions → hen-gio**: mỗi lần chạy có in ra đã làm gì |
| Lỗi khi lưu hoặc gửi | Netlify → **Logs → Functions → bua-an** |
| Ảnh không hiện | Kiểm `data/tai-nguyen.json` đã có ảnh đó chưa. Chưa có thì nhờ Claude chạy `tools/xu-ly-anh.sh` |
| Tin cách nấu sai | Sửa `docs/cach-nau.md` |
| Thông báo trên iPhone đến trễ hoặc không đến | Thông báo web trên iPhone đôi khi không ổn định. Theo brief, khi đó chuyển sang bot Telegram nhắn Yến lúc 16:00 |

## Các file
| File | Làm gì |
| --- | --- |
| `index.html`, `js/app.js`, `css/app.css` | App: 6 màn hình, luật chọn món, âm thanh, hiệu ứng, ảnh nền |
| `data/mon-an.json` | 20 món, là nguồn dữ liệu duy nhất cho món ăn |
| `data/tai-nguyen.json` | Danh sách ảnh nền, ảnh món, âm thanh (do `tools/xu-ly-anh.sh` tạo) |
| `docs/cach-nau.md` | Cách nấu 20 món (tin số 3 của Huy) |
| `docs/prompt-anh-mon.md` | Câu lệnh tạo ảnh cho 20 món |
| `assets/` | File gốc Huy tải lên: logo, ảnh nền (`nen/`), ảnh món (`mon/`), âm thanh, nhạc nền (`nhac-nen.mp3`) |
| `img/` | Ảnh đã nén cho app (do `tools/xu-ly-anh.sh` tạo) |
| `tools/xu-ly-anh.sh` | Nén ảnh và tạo `data/tai-nguyen.json` |
| `manifest.webmanifest`, `icons/` | Tên và icon khi "Thêm vào MH chính" |
| `sw.js` | File chạy nền trên iPhone, chỉ để nhận thông báo (không lưu bản cũ của app) |
| `chay-thu.html` | Trang chạy thử giờ của Huy |
| `netlify.toml`, `package.json` | Cài đặt Netlify, thư viện `web-push` |
| `netlify/functions/bua-an.mjs` | `/api/bua-an`: lưu và đọc món, gửi Telegram |
| `netlify/functions/hen-gio.mjs` | Hẹn giờ 16:00 / 16:15 / 16:30 (07:00 / 07:15 / 07:30 UTC) |
| `netlify/functions/chay-thu.mjs` | `/api/chay-thu` cho trang chạy thử |
| `netlify/functions/thong-bao.mjs` | `/api/thong-bao`: lưu đăng ký thông báo của iPhone |
| `netlify/functions/telegram-id.mjs` | `/api/telegram-id`: lấy mã chat (tự tắt khi đủ) |
| `netlify/functions/tao-khoa-thong-bao.mjs` | `/api/tao-khoa-thong-bao`: tạo khóa thông báo (tự tắt khi đã cài) |
| `netlify/lib/telegram.mjs` | Soạn và gửi 4 tin Telegram |
| `netlify/lib/hen-gio.mjs` | Việc của từng giờ, luật tự chọn món |
| `netlify/lib/thong-bao.mjs` | Gửi thông báo đẩy |
| `netlify/lib/chung.mjs` | Phần dùng chung: Supabase, ngày giờ Nhật |
| `supabase/bang.sql`, `supabase/thong-bao.sql` | Tạo bảng `bua_an` và `thong_bao` |
| `design/` | Bản gốc từ Claude Design (chỉ để tham chiếu, không chạy được) |
