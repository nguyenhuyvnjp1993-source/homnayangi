// Gửi thông báo đẩy (Web Push) tới iPhone của Yến (chặng C4).
// Cần 2 biến trong Netlify: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (tạo bằng trang /api/tao-khoa-thong-bao).

import webpush from "web-push";
import { supabase } from "./chung.mjs";

export function vapidReady() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function saveSubscription(sub) {
  return supabase("thong_bao?on_conflict=endpoint", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }])
  });
}

// payload: { title, body, url }. Trả về { ok, gui, loi }.
// Lỗi thông báo không bao giờ làm dừng việc khác (ví dụ tin Telegram 16:15).
export async function pushAll(payload, siteUrl) {
  try {
    return await pushAllInner(payload, siteUrl);
  } catch (e) {
    console.error(e);
    return { ok: false, gui: 0, loi: String(e.message || e) };
  }
}

async function pushAllInner(payload, siteUrl) {
  if (!vapidReady()) return { ok: false, gui: 0, loi: "Chưa cài VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY trong Netlify" };
  // "subject" phải là địa chỉ https (hoặc mailto) để máy chủ thông báo của Apple biết ai gửi.
  const subject = /^https:\/\//.test(siteUrl || "") ? siteUrl : "https://homnayangivooi.netlify.app";
  webpush.setVapidDetails(subject, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const subs = await supabase("thong_bao?select=endpoint,p256dh,auth");
  if (!subs.length) return { ok: false, gui: 0, loi: "Chưa có iPhone nào bật thông báo" };
  let gui = 0;
  const loi = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 3600, urgency: "high" }
      );
      gui++;
    } catch (e) {
      // 404/410: iPhone đã tắt thông báo hoặc gỡ app → xóa địa chỉ cũ.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabase("thong_bao?endpoint=eq." + encodeURIComponent(s.endpoint), { method: "DELETE" });
        loi.push("Một iPhone đã tắt thông báo, đã xóa");
      } else {
        loi.push(String(e.statusCode || "") + " " + String(e.body || e.message || e).slice(0, 200));
      }
    }
  }
  return { ok: gui > 0, gui, loi: loi.join("; ") };
}
