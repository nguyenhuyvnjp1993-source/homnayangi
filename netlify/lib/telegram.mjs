// Soạn và gửi 4 tin Telegram của một đợt (theo mẫu design/Telegram.dc.html).
//   Tin 1 (Yến + Huy): ảnh logo + chú thích thực đơn từng ngày
//   Tin 2 (Huy):       nguyên liệu đi chợ, tên Nhật, gộp trùng, theo quầy
//   Tin 3 (Huy):       cách nấu (docs/cach-nau.md), tự tách nếu > 4096 ký tự, mỗi tin trọn món
// Dùng chung cho "Chốt luôn", "Gửi lại cho Huy" (C3) và app tự chọn 16:30 (C4).

const WEEKDAY = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const LIMIT = 4096;
const CAPTION_LIMIT = 1024;

// Thứ tự quầy và tên theo docs/kiem-tra-nguyen-lieu.md. Tên không có ở đây sẽ vào 【その他】.
const QUAY = [
  ["肉・魚", ["豚ひき肉", "豚バラ ブロック", "豚ロース 生姜焼き用", "豚スペアリブ 一口サイズ", "豚足", "牛こま切れ", "鶏もも肉", "鶏もも肉 唐揚げ用", "鶏レバー", "砂肝", "むきえび", "生鮭切り身"]],
  ["卵・豆腐", ["卵", "木綿豆腐", "絹豆腐"]],
  ["野菜", ["長ねぎ", "トマト", "玉ねぎ", "にんにく", "大根", "生姜", "じゃがいも", "にんじん", "小松菜", "もやし", "にら", "ブロッコリー", "キャベツ", "ほうれん草"]],
  ["乾物", ["乾燥わかめ"]],
  ["調味料", ["生姜焼きのたれ", "照り焼きのたれ", "カレールウ", "味噌", "顆粒だし", "胡麻和えの素", "ごまドレッシング"]]
];

function weekday(ymd) {
  return WEEKDAY[new Date(ymd + "T00:00:00Z").getUTCDay()];
}

// Đọc danh sách món và cách nấu từ chính trang web (thư mục gốc được Netlify đưa lên mạng).
export async function loadData(siteUrl) {
  const get = async (path) => {
    const res = await fetch(new URL(path, siteUrl), { cache: "no-store" });
    if (!res.ok) throw new Error("Không đọc được " + path + " (" + res.status + ")");
    return res.text();
  };
  const [monAn, cachNau] = await Promise.all([get("/data/mon-an.json"), get("/docs/cach-nau.md")]);
  const dishes = {};
  JSON.parse(monAn).forEach((d) => { dishes[d.id] = d; });
  return { dishes, cach: parseCachNau(cachNau) };
}

// Tách cach-nau.md theo từng "### M1. ..." thành { M1: "M1. Thịt kho trứng (40 phút)\nNguyên liệu: ..." }.
export function parseCachNau(md) {
  const out = {};
  const parts = md.split(/^### /m).slice(1);
  for (const p of parts) {
    const id = (/^([A-Z]\d{1,2})\./.exec(p) || [])[1];
    if (!id) continue;
    const body = p.split(/^(?:## |---)/m)[0].trim();
    out[id] = body;
  }
  return out;
}

// rows: các ngày trong đợt [{ ngay, man, rau, nguon, da_doi }], sắp theo ngày.
// kieu: "chot" | "doi" | "tu_chon"
export function buildMessages(rows, data, kieu) {
  const { dishes, cach } = data;
  const tag = kieu === "doi" ? " (đã đổi)" : kieu === "tu_chon" ? " (app tự chọn)" : "";
  const first = weekday(rows[0].ngay), last = weekday(rows[rows.length - 1].ngay);
  const dot = "Đợt " + first;
  const ten = (id) => (dishes[id] ? dishes[id].ten : id);

  const menu =
    ("Mình ăn gì thế, Vợ ơi · " + dot + tag).toLocaleUpperCase("vi") +
    "\nThực đơn của nhà mình như thế này:\n\n" +
    rows.map((r) => weekday(r.ngay) + ": " + ten(r.man) + " + " + ten(r.rau) + (r.da_doi ? " (đã đổi)" : "")).join("\n") +
    "\n\n" + "Về nhanh để ăn cơm nhé".toLocaleUpperCase("vi") + " ❤️";

  const need = new Set();
  rows.forEach((r) => [r.man, r.rau].forEach((id) => ((dishes[id] && dishes[id].nguyen_lieu) || []).forEach((x) => need.add(x))));
  const known = new Set(QUAY.flatMap((q) => q[1]));
  const blocks = [];
  QUAY.forEach(([quay, items]) => {
    const have = items.filter((x) => need.has(x));
    if (have.length) blocks.push("【" + quay + "】\n" + have.join("\n"));
  });
  const other = [...need].filter((x) => !known.has(x));
  if (other.length) blocks.push("【その他】\n" + other.join("\n"));
  const shop = "Đi chợ · " + dot + " (" + first + " → " + last + ")" + tag + "\n\n" + blocks.join("\n\n");

  const head = "Cách nấu · " + dot + tag;
  const ids = rows.flatMap((r) => [r.man, r.rau]);
  const recipes = ids.map((id) => cach[id] || id + ". " + ten(id) + "\n(Chưa có cách nấu trong cach-nau.md)");
  const groups = [];
  let cur = [];
  const size = (parts) => (head + " (9/9)\n\n" + parts.join("\n\n")).length;
  for (const r of recipes) {
    if (cur.length && size(cur.concat([r])) > LIMIT) { groups.push(cur); cur = [r]; }
    else cur = cur.concat([r]);
  }
  if (cur.length) groups.push(cur);
  const cook = groups.map((parts, i) =>
    (groups.length > 1 ? head + " (" + (i + 1) + "/" + groups.length + ")" : head) + "\n\n" + parts.join("\n\n"));

  return { menu, shop, cook };
}

async function call(method, payload) {
  const base = process.env.TELEGRAM_API || "https://api.telegram.org";
  const res = await fetch(base + "/bot" + process.env.TELEGRAM_BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error("Telegram " + method + ": " + (j.description || res.status));
  return j.result;
}

async function sendMenu(chatId, text, logoUrl) {
  if (text.length <= CAPTION_LIMIT) {
    try {
      return await call("sendPhoto", { chat_id: chatId, photo: logoUrl, caption: text });
    } catch (e) {
      console.error("sendPhoto lỗi, gửi chữ thay thế:", e.message);
    }
  }
  return call("sendMessage", { chat_id: chatId, text });
}

// Gửi cả đợt. Trả về { ok: true } hoặc { ok: false, loi }.
export async function sendBatch(rows, data, kieu, siteUrl) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_HUY: huy, TELEGRAM_CHAT_YEN: yen } = process.env;
  if (!token || !huy) {
    return { ok: false, loi: "Chưa cài TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_HUY trong Netlify" };
  }
  try {
    const m = buildMessages(rows, data, kieu);
    const logo = new URL("/icons/logo-400.png", siteUrl).toString();
    // Chưa cài mã chat của Yến thì tạm bỏ qua tin của Yến, Huy vẫn nhận đủ 3 tin.
    if (yen && String(yen) !== String(huy)) await sendMenu(yen, m.menu, logo);
    else if (!yen) console.warn("Chưa có TELEGRAM_CHAT_YEN: bỏ qua tin của Yến");
    await sendMenu(huy, m.menu, logo);
    await call("sendMessage", { chat_id: huy, text: m.shop });
    for (const text of m.cook) await call("sendMessage", { chat_id: huy, text });
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, loi: String(e.message || e) };
  }
}

// Một tin chữ cho Yến (nhắc 16:15). Chưa cài mã chat của Yến thì bỏ qua.
export async function sendToYen(text) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_YEN: yen } = process.env;
  if (!token || !yen) return { ok: false, loi: "Chưa có TELEGRAM_CHAT_YEN, bỏ qua tin Telegram cho Yến" };
  try {
    await call("sendMessage", { chat_id: yen, text });
    return { ok: true };
  } catch (e) {
    return { ok: false, loi: String(e.message || e) };
  }
}
