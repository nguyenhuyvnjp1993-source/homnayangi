// Chặng C2: cầu nối giữa app và bảng bua_an trên Supabase.
// Khóa Supabase chỉ nằm ở đây (biến môi trường của Netlify), không bao giờ gửi xuống iPhone.
//
//   GET  /api/bua-an?tu=2026-10-01&den=2026-10-05   → các ngày đã lưu trong khoảng đó
//   POST /api/bua-an  { "ngay": [{ "ngay": "2026-10-03", "man": "M1", "rau": "R4" }], "doi": false }
//        doi = false: "Chốt luôn"  ·  doi = true: "Gửi lại cho Huy" sau khi đổi món

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

async function supabase(path, init = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Chưa cài SUPABASE_URL / SUPABASE_SECRET_KEY trong Netlify");
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
      const body = await req.json().catch(() => null);
      const list = body && Array.isArray(body.ngay) ? body.ngay : null;
      if (!list || list.length < 1 || list.length > 3) return json(400, { loi: "Cần 1 đến 3 ngày" });
      const today = todayJST();
      for (const d of list) {
        if (!d || !DATE.test(d.ngay) || !DISH.test(d.man) || !DISH.test(d.rau)) {
          return json(400, { loi: "Dữ liệu món không hợp lệ" });
        }
        // Chỉ cho lưu từ hôm qua tới 8 ngày tới, tránh ghi nhầm vào quá khứ xa.
        const diff = dayDiff(d.ngay, today);
        if (diff < -1 || diff > 8) return json(400, { loi: "Ngày " + d.ngay + " nằm ngoài đợt" });
      }
      const doi = body.doi === true;
      const rows = list.map((d) => ({
        ngay: d.ngay, man: d.man, rau: d.rau, nguon: "yen", da_doi: doi, cap_nhat: new Date().toISOString()
      }));
      const saved = await supabase("bua_an?on_conflict=ngay", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(rows)
      });
      return json(200, { ngay: saved });
    }

    return json(405, { loi: "Chỉ nhận GET hoặc POST" });
  } catch (e) {
    console.error(e);
    return json(500, { loi: String(e.message || e) });
  }
};

export const config = { path: "/api/bua-an" };
