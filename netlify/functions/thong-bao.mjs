// Đăng ký thông báo của iPhone (chặng C4), địa chỉ /api/thong-bao.
//   GET  → { khoa: VAPID public key } để app đăng ký
//   POST { endpoint, keys: { p256dh, auth } } → lưu vào bảng thong_bao

import { json } from "../lib/chung.mjs";
import { vapidReady, saveSubscription } from "../lib/thong-bao.mjs";

export default async (req) => {
  if (!vapidReady()) return json(503, { loi: "Chưa cài VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY trong Netlify" });
  if (req.method === "GET") return json(200, { khoa: process.env.VAPID_PUBLIC_KEY });
  if (req.method !== "POST") return json(405, { loi: "Chỉ nhận GET hoặc POST" });
  const sub = await req.json().catch(() => null);
  if (!sub || !/^https:\/\//.test(sub.endpoint || "") || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return json(400, { loi: "Dữ liệu đăng ký không hợp lệ" });
  }
  try {
    await saveSubscription(sub);
    return json(200, { ok: true });
  } catch (e) {
    console.error(e);
    return json(500, { loi: String(e.message || e) });
  }
};

export const config = { path: "/api/thong-bao" };
