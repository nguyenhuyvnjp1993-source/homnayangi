// Nút "chạy thử giờ" của Huy (trang chay-thu.html): chạy ngay bước 16:00 / 16:15 / 16:30.
// Cần nhập đúng mã HEN_GIO_MA (Huy tự đặt trong Netlify), người khác không bấm được.

import { runStep } from "../lib/hen-gio.mjs";
import { json } from "../lib/chung.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { loi: "Chỉ nhận POST" });
  const body = (await req.json().catch(() => null)) || {};
  const ma = process.env.HEN_GIO_MA;
  if (!ma) return json(400, { loi: "Chưa cài HEN_GIO_MA trong Netlify" });
  if (body.ma !== ma) return json(403, { loi: "Sai mã chạy thử" });
  if (!["1600", "1615", "1630"].includes(body.buoc)) return json(400, { loi: "Bước không hợp lệ" });
  const dot = ["thu3", "thu5", "thu7", "thuong"].includes(body.dot) ? body.dot : undefined;
  try {
    return json(200, await runStep(body.buoc, { dot, siteUrl: new URL(req.url).origin }));
  } catch (e) {
    console.error(e);
    return json(500, { loi: String(e.message || e) });
  }
};

export const config = { path: "/api/chay-thu" };
