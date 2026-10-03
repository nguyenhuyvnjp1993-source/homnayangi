// Phần dùng chung cho các hàm máy chủ: gọi Supabase, ngày giờ Nhật, trả JSON.

export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const DISH = /^[A-Z]\d{1,2}$/;

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export function todayJST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}
export function addDays(ymd, n) {
  return new Date(Date.parse(ymd + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}
export function dayDiff(a, b) {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
}
export function weekdayOf(ymd) {
  return new Date(ymd + "T00:00:00Z").getUTCDay();
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

export async function supabase(path, init = {}) {
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

export function readMeals(tu, den) {
  return supabase("bua_an?select=ngay,man,rau,nguon,da_doi&ngay=gte." + tu + "&ngay=lte." + den + "&order=ngay.asc");
}

export function upsertMeals(rows) {
  return supabase("bua_an?on_conflict=ngay", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows)
  });
}
