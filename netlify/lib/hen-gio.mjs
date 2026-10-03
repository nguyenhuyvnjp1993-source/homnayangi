// Việc theo giờ (chặng C4), giờ Nhật:
//   16:00  ngày đi chợ: thông báo "Chọn món cho đợt này nhé!"  ·  ngày khác: "Hôm nay ăn: A + B"
//   16:15  ngày đi chợ, Yến chưa chốt: nhắc lần 2 (thông báo + tin Telegram cho Yến kèm link)
//   16:30  ngày đi chợ, Yến chưa chốt: tự chọn món, lưu, gửi 4 tin Telegram ghi "(app tự chọn)"
// Dùng cho hàm hẹn giờ (hen-gio.mjs) và trang chạy thử của Huy (chay-thu.mjs).

import { todayJST, addDays, dayDiff, weekdayOf, readMeals, upsertMeals } from "./chung.mjs";
import { loadData, sendBatch, sendToYen } from "./telegram.mjs";
import { pushAll } from "./thong-bao.mjs";

const DOT = { thu3: { wd: 2, n: 2 }, thu5: { wd: 4, n: 2 }, thu7: { wd: 6, n: 3 } };
const DOT_BY_WD = { 2: "thu3", 4: "thu5", 6: "thu7" };
const TITLE = "Mình ăn gì thế, Vợ ơi";

// dot: undefined = theo hôm nay · "thu3" | "thu5" | "thu7" = đợt có thứ đó gần nhất (như link ?dot=) · "thuong" = ngày thường hôm nay
export function resolveDay(dot) {
  const today = todayJST();
  if (DOT[dot]) {
    const start = addDays(today, (DOT[dot].wd - weekdayOf(today) + 7) % 7);
    return { market: true, dot, start, n: DOT[dot].n, test: true };
  }
  if (dot === "thuong") return { market: false, day: today, test: true };
  const d = DOT_BY_WD[weekdayOf(today)];
  return d ? { market: true, dot: d, start: today, n: DOT[d].n, test: false } : { market: false, day: today, test: false };
}

// Tự chọn: mỗi ngày 1 mặn + 1 rau, không trùng món đã ăn/đã chọn trong 3 ngày trước ngày đó.
// history: các dòng bua_an trước ngày đầu đợt. dishes: { id: món } từ mon-an.json.
export function autoPick(start, n, history, dishes, random = Math.random) {
  const list = Object.values(dishes);
  const eaten = {}; // ngày → [mã món]
  history.forEach((r) => { eaten[r.ngay] = [r.man, r.rau]; });
  const picks = [];
  for (let i = 0; i < n; i++) {
    const day = addDays(start, i);
    const recent = new Set();
    for (let k = 1; k <= 3; k++) (eaten[addDays(day, -k)] || []).forEach((id) => recent.add(id));
    const pick = (loai) => {
      const all = list.filter((d) => d.loai === loai);
      const free = all.filter((d) => !recent.has(d.id));
      const pool = free.length ? free : all;
      return pool[Math.floor(random() * pool.length)].id;
    };
    const p = { ngay: day, man: pick("man"), rau: pick("rau") };
    picks.push(p);
    eaten[day] = [p.man, p.rau];
  }
  return picks;
}

export async function runStep(buoc, { dot, siteUrl }) {
  const site = siteUrl || process.env.URL || "https://homnayangivooi.netlify.app";
  const d = resolveDay(dot);
  const out = { buoc, ngay: d.market ? d.start : d.day, loai: d.market ? "Ngày đi chợ (" + d.dot + ")" : "Ngày thường", viec: [] };
  const link = site + "/" + (d.test ? (d.market ? "?dot=" + d.dot : "?xem=homnay") : "");

  if (!d.market) {
    if (buoc !== "1600") { out.viec.push("Ngày thường: chỉ có thông báo lúc 16:00, bước này không làm gì"); return out; }
    const rows = await readMeals(d.day, d.day);
    if (!rows.length) { out.viec.push("Hôm nay chưa có món nào được chốt, không gửi thông báo"); return out; }
    const { dishes } = await loadData(site);
    const ten = (id) => (dishes[id] ? dishes[id].ten : id);
    const r = await pushAll({ title: TITLE, body: "Hôm nay ăn: " + ten(rows[0].man) + " + " + ten(rows[0].rau), url: link }, site);
    out.viec.push(pushText(r));
    return out;
  }

  const end = addDays(d.start, d.n - 1);
  const rows = await readMeals(addDays(d.start, -3), end);
  const batch = rows.filter((r) => r.ngay >= d.start);
  if (batch.length === d.n) {
    out.viec.push("Đợt này đã chốt rồi (" + (batch[0].nguon === "tu_chon" ? "app tự chọn" : "Yến chọn") + "), không làm gì");
    return out;
  }

  if (buoc === "1600") {
    out.viec.push(pushText(await pushAll({ title: TITLE, body: "Chọn món cho đợt này nhé!", url: link }, site)));
  } else if (buoc === "1615") {
    out.viec.push(pushText(await pushAll({ title: TITLE, body: "Vợ ơi, chọn món đi nè! 16:30 app sẽ tự chọn đó.", url: link }, site)));
    const t = await sendToYen("Vợ ơi, chưa chọn món cho đợt này nè. Bấm vào đây chọn nhé:\n" + link + "\n\n16:30 app sẽ tự chọn giúp.");
    out.viec.push(t.ok ? "Đã gửi tin Telegram nhắc Yến" : "Telegram cho Yến: " + t.loi);
  } else if (buoc === "1630") {
    const data = await loadData(site);
    const history = rows.filter((r) => dayDiff(r.ngay, d.start) < 0);
    const picks = autoPick(d.start, d.n, history, data.dishes);
    const saved = await upsertMeals(picks.map((p) => ({ ...p, nguon: "tu_chon", da_doi: false, cap_nhat: new Date().toISOString() })));
    out.viec.push("Đã tự chọn và lưu: " + saved.map((r) => r.ngay + " " + r.man + "+" + r.rau).join(", "));
    const t = await sendBatch(saved.sort((a, b) => (a.ngay < b.ngay ? -1 : 1)), data, "tu_chon", site);
    out.viec.push(t.ok ? "Đã gửi 4 tin Telegram (app tự chọn)" : "Telegram lỗi: " + t.loi);
  } else {
    out.viec.push("Bước không hợp lệ: " + buoc);
  }
  return out;
}

function pushText(r) {
  return r.ok ? "Đã gửi thông báo tới " + r.gui + " iPhone" + (r.loi ? " (" + r.loi + ")" : "") : "Thông báo chưa gửi được: " + r.loi;
}

// Giờ hiện tại (giờ Nhật) ứng với bước nào. Hàm hẹn giờ chạy lúc 16:00, 16:15, 16:30.
export function stepNow(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(date).map((x) => [x.type, x.value]));
  const h = Number(p.hour), m = Number(p.minute);
  if (h !== 16) return null;
  return m < 10 ? "1600" : m < 25 ? "1615" : "1630";
}
