// Trang nhỏ giúp Huy lấy mã chat Telegram (chặng C3), mở bằng /api/telegram-id.
// Liệt kê những người vừa bấm Start / nhắn cho bot. Không bao giờ hiện token.
// Khi đã cài đủ TELEGRAM_CHAT_HUY và TELEGRAM_CHAT_YEN trong Netlify, trang tự tắt.

function page(status, body) {
  return new Response(
    '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>Mã chat Telegram</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.5;color:#3a1f4d}" +
      "table{border-collapse:collapse}td,th{border:1px solid #e9b8cf;padding:8px 12px;text-align:left}code{font-size:18px}</style></head><body>" +
      body + "</body></html>",
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default async () => {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_HUY: huy, TELEGRAM_CHAT_YEN: yen } = process.env;
  if (huy && yen) return page(403, "<h1>Trang này đã tắt</h1><p>Đã cài đủ mã chat của Huy và Yến.</p>");
  if (!token) return page(400, "<h1>Chưa có token bot</h1><p>Thêm biến <b>TELEGRAM_BOT_TOKEN</b> trong Netlify, rồi Trigger deploy.</p>");

  const base = process.env.TELEGRAM_API || "https://api.telegram.org";
  const res = await fetch(base + "/bot" + token + "/getUpdates");
  const j = await res.json().catch(() => ({}));
  if (!j.ok) return page(502, "<h1>Telegram báo lỗi</h1><p>" + esc(j.description || res.status) + "</p><p>Kiểm lại token trong Netlify.</p>");

  const chats = new Map();
  for (const u of j.result || []) {
    const c = (u.message || u.edited_message || u.my_chat_member || {}).chat;
    if (c && c.type === "private") chats.set(c.id, [c.first_name, c.last_name].filter(Boolean).join(" ") + (c.username ? " (@" + c.username + ")" : ""));
  }
  if (!chats.size) {
    return page(200, "<h1>Chưa thấy ai nhắn cho bot</h1><p>Mở bot trong Telegram, bấm <b>Start</b> (hoặc nhắn một chữ bất kỳ), rồi tải lại trang này.</p>");
  }
  const rows = [...chats].map(([id, name]) => "<tr><td>" + esc(name) + "</td><td><code>" + esc(id) + "</code></td></tr>").join("");
  return page(200, "<h1>Mã chat Telegram</h1><table><tr><th>Tên</th><th>Mã chat</th></tr>" + rows + "</table>" +
    "<p>Chép mã của Huy vào biến <b>TELEGRAM_CHAT_HUY</b>, mã của Yến vào <b>TELEGRAM_CHAT_YEN</b> trong Netlify. Cài đủ 2 mã thì trang này tự tắt.</p>");
};

export const config = { path: "/api/telegram-id" };
