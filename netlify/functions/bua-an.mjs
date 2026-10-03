// Cầu nối giữa app, bảng bua_an trên Supabase (C2) và bot Telegram (C3).
// Khóa Supabase và token bot chỉ nằm ở đây (biến môi trường của Netlify), không bao giờ gửi xuống iPhone.
//
//   GET  /api/bua-an?tu=2026-10-01&den=2026-10-05   → các ngày đã lưu trong khoảng đó
//   POST /api/bua-an  { "tu": "2026-10-03", "den": "2026-10-05", "doi": false,
//                       "ngay": [{ "ngay": "2026-10-03", "man": "M1", "rau": "R4" }, ...] }
//        Lưu các ngày trong "ngay", rồi gửi 4 tin Telegram của cả đợt tu → den.
//        doi = false: "Chốt luôn"  ·  doi = true: "Gửi lại cho Huy" sau khi đổi món (tin ghi "(đã đổi)")
//   POST /api/bua-an  { "tu": ..., "den": ..., "doi": ..., "chi_gui": true }
//        Không lưu gì, chỉ gửi lại Telegram (khi lần trước Telegram lỗi).

import { loadData, sendBatch } from "../lib/telegram.mjs";
import { DATE, DISH, json, todayJST, dayDiff, readMeals, upsertMeals } from "../lib/chung.mjs";

export default async (req) => {
  try {
    if (req.method === "GET") {
      const q = new URL(req.url).searchParams;
      const tu = q.get("tu"), den = q.get("den");
      if (!DATE.test(tu || "") || !DATE.test(den || "") || dayDiff(den, tu) < 0 || dayDiff(den, tu) > 31) {
        return json(400, { loi: "Khoảng ngày không hợp lệ" });
      }
      return json(200, { ngay: await readMeals(tu, den) });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => null)) || {};
      const today = todayJST();
      const doi = body.doi === true;
      // tu/den: ngày đầu và ngày cuối của cả đợt, để soạn tin Telegram cho đủ các ngày.
      const { tu, den } = body;
      if (!DATE.test(tu || "") || !DATE.test(den || "") || dayDiff(den, tu) < 0 || dayDiff(den, tu) > 2 ||
          dayDiff(tu, today) < -1 || dayDiff(den, today) > 8) {
        return json(400, { loi: "Ngày của đợt không hợp lệ" });
      }

      let saved = null;
      if (!body.chi_gui) {
        const list = Array.isArray(body.ngay) ? body.ngay : null;
        if (!list || list.length < 1 || list.length > 3) return json(400, { loi: "Cần 1 đến 3 ngày" });
        for (const d of list) {
          if (!d || !DATE.test(d.ngay) || !DISH.test(d.man) || !DISH.test(d.rau)) {
            return json(400, { loi: "Dữ liệu món không hợp lệ" });
          }
          if (d.ngay < tu || d.ngay > den) return json(400, { loi: "Ngày " + d.ngay + " nằm ngoài đợt" });
        }
        const rows = list.map((d) => ({
          ngay: d.ngay, man: d.man, rau: d.rau, nguon: "yen", da_doi: doi, cap_nhat: new Date().toISOString()
        }));
        saved = await upsertMeals(rows);
      }

      // C3: lưu xong thì gửi 4 tin Telegram của cả đợt. Telegram lỗi thì món vẫn đã lưu, app báo để bấm gửi lại.
      const batch = await readMeals(tu, den);
      let telegram;
      if (batch.length !== dayDiff(den, tu) + 1) {
        telegram = { ok: false, loi: "Đợt chưa đủ món các ngày, chưa gửi Telegram" };
      } else {
        try {
          const site = new URL(req.url).origin;
          telegram = await sendBatch(batch, await loadData(site), doi ? "doi" : "chot", site);
        } catch (e) {
          console.error(e);
          telegram = { ok: false, loi: String(e.message || e) };
        }
      }
      return json(200, { ngay: saved, telegram });
    }

    return json(405, { loi: "Chỉ nhận GET hoặc POST" });
  } catch (e) {
    console.error(e);
    return json(500, { loi: String(e.message || e) });
  }
};

export const config = { path: "/api/bua-an" };
