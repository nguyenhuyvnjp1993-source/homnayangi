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

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DISH = /^[A-Z]\d{1,2}$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function todayJST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}
function dayDiff(a, b) {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
}

function isSecretKey(key) {
  if (key.startsWith("sb_secret_")) return true;
  if (key.startsWith("sb_")) return false;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

async function supabase(path, init = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Chưa cài SUPABASE_URL / SUPABASE_SECRET_KEY trong Netlify");
  // Khóa công khai (publishable / anon) không vượt được RLS: đọc ra bảng trống, ghi thì bị chặn.
  // Báo rõ ngay để khỏi tưởng là chưa có lịch sử.
  if (!isSecretKey(key)) {
    throw new Error("SUPABASE_SECRET_KEY trong Netlify đang là khóa công khai (publishable/anon). Cần khóa Secret (sb_secret_...) hoặc service_role");
  }
  const headers = { apikey: key, "content-type": "application/json", ...(init.headers || {}) };
  // Khóa kiểu cũ (service_role, dạng JWT) cần thêm Authorization; khóa mới sb_secret_ thì không.
  if (!key.startsWith("sb_")) headers.authorization = "Bearer " + key;
  const res = await fetch(url.replace(/\/+$/, "") + "/rest/v1/" + path, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error("Supabase " + res.status + ": " + text.slice(0, 300));
  return text ? JSON.parse(text) : null;
}

export default async (req) => {
  try {
    if (req.method === "GET") {
      const q = new URL(req.url).searchParams;
      const tu = q.get("tu"), den = q.get("den");
      if (!DATE.test(tu || "") || !DATE.test(den || "") || dayDiff(den, tu) < 0 || dayDiff(den, tu) > 31) {
        return json(400, { loi: "Khoảng ngày không hợp lệ" });
      }
      const rows = await supabase(
        "bua_an?select=ngay,man,rau,nguon,da_doi&ngay=gte." + tu + "&ngay=lte." + den + "&order=ngay.asc"
      );
      return json(200, { ngay: rows });
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
        saved = await supabase("bua_an?on_conflict=ngay", {
          method: "POST",
          headers: { prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(rows)
        });
      }

      // C3: lưu xong thì gửi 4 tin Telegram của cả đợt. Telegram lỗi thì món vẫn đã lưu, app báo để bấm gửi lại.
      const batch = await supabase(
        "bua_an?select=ngay,man,rau,nguon,da_doi&ngay=gte." + tu + "&ngay=lte." + den + "&order=ngay.asc"
      );
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
