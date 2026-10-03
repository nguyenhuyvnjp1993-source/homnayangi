// Trang dùng một lần: tạo cặp khóa thông báo (VAPID) để Huy chép vào Netlify.
// Khi đã cài đủ VAPID_PUBLIC_KEY và VAPID_PRIVATE_KEY, trang tự tắt.
// Mỗi lần tải lại trang ra một cặp khóa mới: chép cả 2 khóa của CÙNG một lần.

import webpush from "web-push";
import { vapidReady } from "../lib/thong-bao.mjs";

function page(status, body) {
  return new Response(
    '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>Khóa thông báo</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.5;color:#3a1f4d}" +
      "code{display:block;word-break:break-all;background:#fff4f8;border:1px solid #e9b8cf;padding:10px;border-radius:8px;font-size:15px}</style></head><body>" +
      body + "</body></html>",
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

export default async () => {
  if (vapidReady()) return page(403, "<h1>Trang này đã tắt</h1><p>Đã cài đủ khóa thông báo trong Netlify.</p>");
  const k = webpush.generateVAPIDKeys();
  return page(200,
    "<h1>Khóa thông báo</h1><p>Chép 2 khóa dưới đây vào Netlify → Environment variables (cả 2 khóa của cùng một lần mở trang):</p>" +
    "<p><b>VAPID_PUBLIC_KEY</b></p><code>" + k.publicKey + "</code>" +
    "<p><b>VAPID_PRIVATE_KEY</b> (đánh dấu <i>Contains secret values</i>)</p><code>" + k.privateKey + "</code>" +
    "<p>Xong thì Trigger deploy. Trang này sẽ tự tắt.</p>");
};

export const config = { path: "/api/tao-khoa-thong-bao" };
