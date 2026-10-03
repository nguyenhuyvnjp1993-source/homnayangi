/* App "Mình ăn gì thế, Vợ ơi": 6 màn hình, dữ liệu món từ data/mon-an.json.
   C2: "Chốt luôn" / "Gửi lại" lưu vào Supabase qua /api/bua-an; "Vừa ăn" đọc lịch sử thật.
   C3: máy chủ lưu xong thì gửi 4 tin Telegram (Yến 1 tin, Huy 3 tin).
   C4: nút "Bật thông báo" + sw.js để nhận thông báo 16:00 / 16:15.
   C5: ảnh nền (xáo thứ tự mỗi lần mở app), ảnh món, âm thanh từ file – danh sách ở data/tai-nguyen.json.
   Logic chuyển màn và chọn món chép theo design/Main.dc.html. */
(function () {
  "use strict";

  var DAYS = { thu3: ["Thứ 3", "Thứ 4"], thu5: ["Thứ 5", "Thứ 6"], thu7: ["Thứ 7", "Chủ nhật", "Thứ 2"] };
  var DOT_LABEL = {
    thu3: "Đợt Thứ 3 · chọn cho 2 ngày",
    thu5: "Đợt Thứ 5 · chọn cho 2 ngày",
    thu7: "Đợt Thứ 7 · chọn cho 3 ngày (Thứ 7, Chủ nhật, Thứ 2)"
  };
  var WEEKDAY = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  /* Ngày đi chợ theo thứ trong tuần (0 = Chủ nhật). */
  var DOT_BY_WEEKDAY = { 2: "thu3", 4: "thu5", 6: "thu7" };
  var DOT_WD = { thu3: 2, thu5: 4, thu7: 6 };
  var API = "/api/bua-an";
  /* Lịch sử món đã ăn trong 3 ngày trước đợt này (ago = số ngày trước ngày 1), đọc từ Supabase. */
  var HISTORY = [];
  /* Món đã lưu cho hôm nay, dùng ở màn "Hôm nay ăn gì". */
  var TODAY_MEAL = null;

  var DISHES = [], BYID = {};
  /* Ảnh và âm thanh Huy thêm vào (tools/xu-ly-anh.sh tạo danh sách). Thiếu thì app dùng khung màu / âm tạo bằng code. */
  var RES = { nen: [], mon: {}, am_thanh: {} };
  var SCREENS = ["chao", "chon", "xacnhan", "dagui", "doimon", "homnay"];
  var BG_OF = {};
  var app = document.getElementById("app");
  var screenEl = document.getElementById("screen");
  var muteBtn = document.getElementById("mute");
  var confettiEl = document.getElementById("confetti");

  var params = new URLSearchParams(location.search);
  var todayWd = weekdayJST();
  var dot = DAYS[params.get("dot")] ? params.get("dot") : (DOT_BY_WEEKDAY[todayWd] || "thu3");
  var isMarketDay = !!DAYS[params.get("dot")] || !!DOT_BY_WEEKDAY[todayWd];
  var firstScreen = params.get("xem") === "homnay" || !isMarketDay ? "homnay" : "chao";
  /* Ngày của đợt: ngày đi chợ là hôm nay; link thử ?dot= thì lấy ngày có thứ đó gần nhất (hôm nay hoặc sắp tới). */
  var todayStr = dateJST();
  var startDate = addDays(todayStr, ((DOT_WD[dot] - todayWd) + 7) % 7);

  var S = {
    screen: firstScreen,
    day: 0,
    picks: emptyPicks(),
    muted: false,
    changeDay: 0,
    changeGroup: null,
    changed: false,
    changedDays: [],
    sentChanged: false,
    tgError: "",
    saving: false,
    saveError: ""
  };

  /* ---------- Tiện ích ---------- */
  function weekdayJST() {
    var name = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", weekday: "short" }).format(new Date());
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
  }
  function dateJST() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
  }
  function addDays(ymd, n) {
    var d = new Date(Date.parse(ymd + "T00:00:00Z") + n * 86400000);
    return d.toISOString().slice(0, 10);
  }
  function dayDiff(a, b) { return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000); }
  function days() { return DAYS[dot]; }
  function emptyPicks() { return DAYS[dot].map(function () { return { man: null, rau: null }; }); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* Tách "Cà ri Nhật (カレーライス)" thành tên chính và dòng tiếng Nhật. */
  function split(n) {
    var m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(n || "");
    return m ? { main: m[1], sub: m[2] } : { main: n || "", sub: "" };
  }
  function info(id) { return id && BYID[id] ? split(BYID[id].ten) : { main: "—", sub: "" }; }

  /* ---------- Âm thanh (tạo bằng Web Audio như design) ---------- */
  var ac = null;
  /* Âm thanh từ file (assets/pop.mp3, assets/ting.mp3) nếu Huy có thêm; nạp một lần, chưa nạp xong thì dùng âm tạo bằng code. */
  var buffers = {}, loading = {};
  function loadSound(kind) {
    var src = RES.am_thanh && RES.am_thanh[kind];
    if (!src || loading[kind]) return;
    loading[kind] = true;
    fetch(src).then(function (r) { return r.arrayBuffer(); }).then(function (data) {
      return new Promise(function (ok, fail) { ac.decodeAudioData(data, ok, fail); });
    }).then(function (buf) { buffers[kind] = buf; }).catch(function (e) { console.warn("Không nạp được " + src, e); });
  }
  function sound(kind) {
    if (S.muted) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      ac = ac || new C();
      if (ac.state === "suspended") ac.resume();
      loadSound("pop"); loadSound("ting");
      if (buffers[kind]) {
        var src = ac.createBufferSource();
        src.buffer = buffers[kind];
        src.connect(ac.destination);
        src.start();
        return;
      }
      var t = ac.currentTime;
      if (kind === "pop") {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(720, t);
        o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 0.13);
      } else {
        [1318.5, 1975.5].forEach(function (f, i) {
          var o2 = ac.createOscillator(), g2 = ac.createGain(), s = t + i * 0.07;
          o2.type = "triangle";
          o2.frequency.value = f;
          g2.gain.setValueAtTime(0.0001, s);
          g2.gain.exponentialRampToValueAtTime(0.25, s + 0.01);
          g2.gain.exponentialRampToValueAtTime(0.0001, s + 0.6);
          o2.connect(g2); g2.connect(ac.destination);
          o2.start(s); o2.stop(s + 0.65);
        });
      }
    } catch (e) {}
  }

  /* ---------- Hiệu ứng ---------- */
  var CF_COLORS = ["var(--pink)", "var(--orange)", "var(--purple)", "var(--teal)", "var(--yellow)"];
  var cfTimer = null;
  function confettiAt(x, y) {
    var html = "";
    for (var i = 0; i < 18; i++) {
      var a = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var r = 70 + Math.random() * 70;
      var round = i % 3 === 0;
      var w = round ? 8 : 11, h = round ? 8 : 6;
      html += '<span class="kdc-cf" style="left:' + Math.round(x - w / 2) + "px;top:" + Math.round(y - h / 2) + "px;width:" + w + "px;height:" + h +
        "px;--dx:" + Math.round(Math.cos(a) * r) + "px;--dy:" + Math.round(Math.sin(a) * r * 0.8 - 55) + "px;--g:" + Math.round(170 + Math.random() * 110) +
        "px;--r:" + Math.round((Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 420)) + 'deg"><span class="kdc-cf-in" style="background:' +
        CF_COLORS[i % 5] + ";border-radius:" + (round ? "999px" : "2px") + ";--f:" + (round ? 9999 : Math.round(380 + Math.random() * 420)) + 'ms"></span></span>';
    }
    confettiEl.insertAdjacentHTML("beforeend", html);
    clearTimeout(cfTimer);
    cfTimer = setTimeout(function () { confettiEl.innerHTML = ""; }, 1800);
  }

  function drawHearts() {
    var spec = [[6, 18, 14, 0, 0.40, "#ffffff"], [18, 26, 17, 6, 0.30, "var(--pink-soft)"], [30, 14, 12, 2, 0.45, "#ffffff"], [42, 22, 19, 10, 0.28, "var(--pink-soft)"], [54, 16, 13, 4, 0.40, "#ffffff"], [64, 30, 18, 12, 0.25, "var(--pink-soft)"], [74, 18, 15, 8, 0.38, "#ffffff"], [84, 24, 16, 1, 0.30, "var(--pink-soft)"], [92, 14, 11, 5, 0.45, "#ffffff"], [48, 20, 15, 14, 0.32, "#ffffff"]];
    document.getElementById("hearts").innerHTML = spec.map(function (s) {
      return '<span class="kdc-heart" style="left:' + s[0] + "%;width:" + s[1] + "px;height:" + s[1] + "px;color:" + s[5] + ";--o:" + s[4] +
        ";animation-duration:" + s[2] + "s;animation-delay:-" + s[3] + 's"><svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.2 4.5 2.6.3.5 1 .5 1.3 0 .9-1.4 2.3-2.6 4.5-2.6 3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z"></path></svg></span>';
    }).join("");
  }

  /* Hạt kẹo nổ quanh dấu ✓ ở màn "Đã gửi" (thu nhỏ để khung chữ gọn, không che ảnh nền). */
  var PARTICLES = (function () {
    var k = 0.55;
    var out = "";
    for (var i = 0; i < 20; i++) {
      var a = (i / 20) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08);
      var r = (92 + (i % 3) * 18) * k;
      var dx = Math.round(Math.cos(a) * r), dy = Math.round(Math.sin(a) * r);
      var pill = i % 3 === 0, w = pill ? 14 : 9, h = pill ? 7 : 9;
      out += '<span class="kdc-p" style="--dx:' + dx + "px;--dy:" + dy + "px;width:" + w + "px;height:" + h + "px;margin:" + (-h / 2) + "px 0 0 " + (-w / 2) +
        "px;border-radius:999px;background:" + CF_COLORS[i % 5] + ";animation-delay:" + (i % 4) * 30 + 'ms"></span>';
    }
    return out;
  })();

  /* ---------- Luật chọn món ---------- */
  /* Món "Vừa ăn": đã ăn hoặc đã chọn trong 3 ngày gần nhất tính từ ngày dayIdx. */
  function recent(dayIdx, bothWays) {
    var set = {};
    HISTORY.forEach(function (h) { if (dayIdx + h.ago <= 3) h.ids.forEach(function (id) { set[id] = 1; }); });
    S.picks.forEach(function (p, j) {
      if (j === dayIdx) return;
      if ((j < dayIdx || bothWays) && Math.abs(dayIdx - j) <= 3) {
        if (p.man) set[p.man] = 1;
        if (p.rau) set[p.rau] = 1;
      }
    });
    return set;
  }

  function setPick(dayIdx, group, id) {
    S.picks = S.picks.map(function (p) { return { man: p.man, rau: p.rau }; });
    S.picks[dayIdx][group] = id;
  }

  /* ---------- Thành phần giao diện ---------- */
  function btn(label, act, variant, shape, disabled) {
    return '<button type="button" class="btn kdc-bounce ' + variant + " " + shape + '" data-act="' + act + '"' + (disabled ? " disabled" : "") + ">" + esc(label) + "</button>";
  }

  /* Thẻ món: ảnh vuông + tên món (không hiện số phút nấu). */
  function foodCard(d, group, st, opts) {
    opts = opts || {};
    var nm = split(d ? d.ten : "—");
    var blocked = st === "locked" || st === "recent";
    var h = '<div class="card ' + group + " " + st + (opts.lg ? " lg" : "") + '">';
    h += '<button type="button" class="hit' + (opts.lg ? "" : " kdc-bounce") + '"' + (blocked || opts.lg ? " disabled" : "") +
      ' aria-pressed="' + (st === "selected") + '"' + (opts.act && !blocked ? ' data-act="' + opts.act + '" data-id="' + esc(d.id) + '"' : "") + ">";
    h += '<span class="ph">' + (d && RES.mon[d.id] ? '<img src="' + esc(RES.mon[d.id]) + '" alt="" width="600" height="600" loading="lazy">' : '<i class="plate" aria-hidden="true"></i>') + "</span>";
    h += '<span class="nm">' + esc(nm.main) + "</span>";
    if (nm.sub) h += '<span class="sub" lang="ja">' + esc(nm.sub) + "</span>";
    h += "</button>";
    if (st === "recent") h += '<span class="tag">Vừa ăn</span>';
    if (st === "selected" && opts.removeAct) {
      h += '<button type="button" class="x" data-act="' + opts.removeAct + '" aria-label="Bỏ chọn ' + esc(nm.main) + '"><span>✕</span></button>';
    }
    return h + "</div>";
  }

  function cards(group, dayIdx, mode) {
    var rec = recent(dayIdx, mode === "change");
    var cur = S.picks[dayIdx] ? S.picks[dayIdx][group] : null;
    return DISHES.filter(function (d) { return d.loai === group; }).map(function (d) {
      var st = "idle";
      if (cur === d.id) st = "selected";
      else if (rec[d.id]) st = "recent";
      else if (cur && mode === "choose") st = "locked";
      if (mode === "choose") return foodCard(d, group, st, { act: "pick-" + group, removeAct: "unpick-" + group });
      return foodCard(d, group, st, { act: "change-pick" });
    }).join("");
  }

  function thumbImg(id, fallback) {
    return id && RES.mon[id] ? '<img src="' + esc(RES.mon[id]) + '" alt="" width="600" height="600">' : fallback;
  }

  function dishLine(id, group, thumbClass) {
    var n = info(id);
    return '<div class="dish-row"><div class="thumb ' + group + (thumbClass || "") + '" aria-hidden="true">' + thumbImg(id, "<i></i>") + '</div><div class="dish-name">' +
      '<span class="main">' + esc(n.main) + "</span>" + (n.sub ? '<span class="ja" lang="ja">' + esc(n.sub) + "</span>" : "") + "</div></div>";
  }

  /* ---------- 6 màn hình ---------- */
  function viewChao() {
    return '<div class="page chao">' +
      '<div class="top"><img class="logo kdc-in" src="icons/logo-400.png" alt="Logo Mình ăn gì thế, Vợ ơi" width="200" height="200">' +
      '<div class="glass box"><p class="brand">Mình ăn gì thế, Vợ ơi</p>' +
      '<h1 class="title-xl kdc-in">Vợ đi làm mệt không, hôm nay muốn ăn gì thế?</h1>' +
      '<p class="muted">' + esc(DOT_LABEL[dot]) + "</p></div>" + notifyHtml() + "</div>" +
      '<div class="center">' + btn("Chọn món thôi", "start", "primary", "pill") + "</div></div>";
  }

  function viewChon() {
    var n = days().length, today = S.picks[S.day];
    var ready = !!(today.man && today.rau);
    var missing = ready ? "Đủ rồi, chốt thôi!" : (!today.man && !today.rau ? "Chọn 1 món mặn và 1 món rau nhé" : (!today.man ? "Còn thiếu món mặn" : "Còn thiếu món rau"));
    var dots = "";
    for (var k = 1; k <= n; k++) dots += '<i class="' + (k <= S.day + 1 ? "on" : "") + '"></i>';
    var nMan = DISHES.filter(function (d) { return d.loai === "man"; }).length;
    var nRau = DISHES.length - nMan;
    return '<div class="page chon">' +
      '<div class="glass head"><div class="day"><span class="chip">Ngày ' + (S.day + 1) + "/" + n + "</span><span>· " + esc(days()[S.day]) +
      '</span><span class="dots" aria-hidden="true">' + dots + "</span></div></div>" +
      '<div class="scroll">' +
      '<section><h2 class="group-title man">Món mặn (' + nMan + ')</h2><div class="grid">' + cards("man", S.day, "choose") + "</div></section>" +
      '<section><h2 class="group-title rau">Món rau (' + nRau + ')</h2><div class="grid">' + cards("rau", S.day, "choose") + "</div></section>" +
      "</div>" +
      '<div class="bottom-bar"><p class="status" role="status">' + esc(missing) + "</p>" + btn("Chốt nhé", "next", "primary", "rect", !ready) + "</div></div>";
  }

  function viewXacNhan() {
    var n = days().length;
    var list = days().map(function (w, i) {
      var p = S.picks[i];
      return '<div class="glass-card daybox"><div class="row"><span class="num">Ngày ' + (i + 1) + "/" + n + '</span><span class="wd">' + esc(w) + "</span></div>" +
        dishLine(p.man, "man") + dishLine(p.rau, "rau") + "</div>";
    }).join("");
    return '<div class="page xacnhan">' +
      '<div class="glass head"><h1 class="title-lg">Thực đơn đợt này</h1><p class="muted">' + esc(DOT_LABEL[dot]) + "</p></div>" +
      '<div class="scroll">' + list + "</div>" +
      '<div class="glass foot">' + saveErrorHtml() + btn(S.saving ? "Đang lưu…" : "Chốt luôn", "confirm", "primary", "rect", S.saving) +
      btn("Khoan đã", "wait", "secondary", "rect", S.saving) + "</div></div>";
  }

  function viewDaGui() {
    var text = S.sentChanged ? "Đã gửi lại thực đơn mới, tin có ghi “(đã đổi)”." : "Thực đơn, danh sách đi chợ và cách nấu đã gửi qua Telegram.";
    if (S.tgError) {
      /* Món đã lưu nhưng Telegram chưa gửi được: báo rõ và cho bấm gửi lại. */
      return '<div class="page dagui">' +
        '<div class="glass box sent-box"><div class="txt"><h1 class="title-lg">Đã lưu món rồi nhé!</h1>' +
        '<p class="save-error" role="alert">Nhưng Telegram chưa gửi được. (' + esc(S.tgError) + ")</p></div></div>" +
        '<div class="dagui-actions">' + btn(S.saving ? "Đang gửi…" : "Gửi lại Telegram", "tg-retry", "primary", "pill", S.saving) +
        btn("Đổi món", "to-change", "secondary", "pill", S.saving) + "</div></div>";
    }
    /* Khung chữ gọn ở trên cùng (✓ nằm cạnh chữ) để không che mặt 2 mẹ con trong ảnh nền. */
    return '<div class="page dagui"><div class="glass box sent-box"><div class="burst">' + PARTICLES +
      '<div class="check kdc-in"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></div></div>' +
      '<div class="txt"><h1 class="title-lg">Đã gửi cho Huy rồi nhé!</h1><p class="muted">' + esc(text) + "</p></div></div>" +
      btn("Đổi món", "to-change", "secondary", "pill") + "</div>";
  }

  function viewDoiMon() {
    var cd = Math.min(S.changeDay, days().length - 1);
    var chips = days().map(function (w, i) {
      return '<button type="button" class="chip-btn day" data-act="change-day" data-i="' + i + '" aria-pressed="' + (i === cd) + '">' + esc(w) + "</button>";
    }).join("");
    var body;
    if (!S.changeGroup) {
      var p = S.picks[cd];
      var row = function (id, group, label, act) {
        var n = info(id);
        return '<div class="glass-card cur"><div class="thumb ' + group + '" aria-hidden="true">' + thumbImg(id, "") + '</div><div class="dish-name"><span class="lbl">' + label + "</span>" +
          '<span class="main">' + esc(n.main) + "</span>" + (n.sub ? '<span class="ja" lang="ja">' + esc(n.sub) + "</span>" : "") + "</div>" +
          '<button type="button" class="chip-btn purple" data-act="' + act + '">Đổi</button></div>';
      };
      body = row(p.man, "man", "Món mặn", "change-man") + row(p.rau, "rau", "Món rau", "change-rau") +
        (S.changedDays.indexOf(cd) >= 0 ? '<p class="changed-note">Ngày này đã đổi món</p>' : "");
    } else {
      body = '<div class="glass change-head"><h2>Chọn món ' + (S.changeGroup === "rau" ? "rau" : "mặn") + " mới cho " + esc(days()[cd]) + "</h2>" +
        '<button type="button" class="chip-btn outline" data-act="cancel-change">Thôi</button></div>' +
        '<div class="grid">' + cards(S.changeGroup, cd, "change") + "</div>";
    }
    return '<div class="page doimon">' +
      '<div class="glass head"><h1 class="title-lg">Đổi món</h1><p class="muted">Chọn ngày muốn đổi trong đợt này</p></div>' +
      '<div class="chips">' + chips + "</div>" +
      '<div class="scroll">' + body + "</div>" +
      '<div class="bottom-bar">' + saveErrorHtml() + btn(S.saving ? "Đang lưu…" : "Gửi lại cho Huy", "resend", "primary", "rect", !S.changed || S.saving) +
      btn("Giữ nguyên", "keep", "ghost", "rect", S.saving) + "</div></div>";
  }

  function viewHomNay() {
    var head = '<div class="glass head"><p class="muted">Mở từ thông báo 16:00</p><h1 class="title-xl">Hôm nay ăn gì · ' + esc(WEEKDAY[todayWd]) + "</h1>";
    if (!TODAY_MEAL || !BYID[TODAY_MEAL.man] || !BYID[TODAY_MEAL.rau]) {
      return '<div class="page homnay">' + head + '<p class="muted">Hôm nay chưa có món nào được chốt.</p></div>' + notifyHtml() + "</div>";
    }
    return '<div class="page homnay">' + head + "</div>" + notifyHtml() +
      '<div class="big">' + foodCard(BYID[TODAY_MEAL.man], "man", "idle", { lg: true }) + "</div>" +
      '<div class="big">' + foodCard(BYID[TODAY_MEAL.rau], "rau", "idle", { lg: true }) + "</div></div>";
  }

  /* ---------- Thông báo 16:00 (C4) ---------- */
  /* iPhone chỉ cho app web nhận thông báo khi đã "Thêm vào MH chính" và Yến tự bấm đồng ý. */
  var NOTI = notifyState();
  function isStandalone() {
    return window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  }
  function notifyState() {
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
      return ios && !isStandalone() ? "install" : "hidden";
    }
    if (Notification.permission === "granted") return "hidden";
    if (Notification.permission === "denied") return "denied";
    return "ask";
  }
  function notifyHtml() {
    if (NOTI === "ask") return '<div class="notify">' + '<button type="button" class="chip-btn purple" data-act="notify">🔔 Bật thông báo 16:00</button></div>';
    if (NOTI === "busy") return '<div class="notify"><button type="button" class="chip-btn purple" disabled>Đang bật…</button></div>';
    if (NOTI === "install") return '<p class="notify-note">Muốn nhận thông báo 16:00: bấm nút Chia sẻ → <b>Thêm vào MH chính</b>, rồi mở app từ màn hình chính.</p>';
    if (NOTI === "denied") return '<p class="notify-note">Thông báo đang tắt. Bật lại trong Cài đặt → Thông báo → Vợ ơi.</p>';
    if (NOTI.indexOf("error:") === 0) {
      return '<div class="notify"><p class="notify-note">Chưa bật được thông báo. (' + esc(NOTI.slice(6)) + ")</p>" +
        '<button type="button" class="chip-btn purple" data-act="notify">Thử lại</button></div>';
    }
    return "";
  }
  function urlKey(b64) {
    var pad = "=".repeat((4 - (b64.length % 4)) % 4);
    var raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  /* Lấy (hoặc tạo) đăng ký nhận thông báo rồi gửi lên máy chủ lưu vào bảng thong_bao. */
  function syncSubscription() {
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) return sub;
        return api("GET", "", null, "/api/thong-bao").then(function (j) {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlKey(j.khoa) });
        });
      });
    }).then(function (sub) { return api("POST", "", sub.toJSON(), "/api/thong-bao"); });
  }
  function enableNotify() {
    /* requestPermission phải gọi ngay trong lúc bấm, iPhone mới hiện hộp hỏi. */
    var ask = Notification.requestPermission();
    NOTI = "busy"; render(true);
    Promise.resolve(ask).then(function (perm) {
      if (perm !== "granted") { NOTI = perm === "denied" ? "denied" : "ask"; return; }
      return syncSubscription().then(function () { NOTI = "hidden"; sound("ting"); });
    }).catch(function (err) { NOTI = "error:" + err.message; })
      .then(function () { render(true); });
  }

  function saveErrorHtml() {
    return S.saveError ? '<p class="save-error" role="alert">' + esc(S.saveError) + "</p>" : "";
  }

  var VIEWS = { chao: viewChao, chon: viewChon, xacnhan: viewXacNhan, dagui: viewDaGui, doimon: viewDoiMon, homnay: viewHomNay };

  /* keepScroll: giữ nguyên vị trí cuộn khi chỉ đổi trạng thái thẻ trong cùng màn. */
  function render(keepScroll) {
    var old = screenEl.querySelector(".scroll");
    var top = keepScroll && old ? old.scrollTop : 0;
    screenEl.innerHTML = VIEWS[S.screen]();
    drawBg(S.screen);
    var sc = screenEl.querySelector(".scroll");
    if (sc) sc.scrollTop = top;
    drawMute();
  }
  /* Ảnh nền: mỗi lần mở app xáo ngẫu nhiên, màn nào nhận ảnh nào. */
  function shuffleBackgrounds() {
    var list = RES.nen.slice();
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = list[i];
      list[i] = list[j]; list[j] = t;
    }
    BG_OF = {};
    if (!list.length) return;
    SCREENS.forEach(function (s, k) { BG_OF[s] = list[k % list.length]; });
    list.forEach(function (src) { new Image().src = src; }); /* tải trước để chuyển màn không bị trắng */
  }
  var bgEl = document.getElementById("bg");
  function drawBg(screen) {
    var src = BG_OF[screen] || BG_OF.chao;
    if (!src) { bgEl.hidden = true; return; }
    if (bgEl.getAttribute("src") !== src) bgEl.setAttribute("src", src);
    bgEl.hidden = false;
  }

  function go(screen, extra) {
    S.screen = screen;
    if (extra) Object.keys(extra).forEach(function (k) { S[k] = extra[k]; });
    render(false);
  }
  function update(extra) {
    Object.keys(extra).forEach(function (k) { S[k] = extra[k]; });
    render(true);
  }

  function drawMute() {
    muteBtn.setAttribute("aria-pressed", String(S.muted));
    muteBtn.setAttribute("aria-label", S.muted ? "Bật tiếng" : "Tắt tiếng");
    muteBtn.innerHTML = S.muted
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M17 9l5 6M22 9l-5 6"></path></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13"></path></svg>';
  }

  /* ---------- Xử lý bấm ---------- */
  var ACTIONS = {
    start: function () { sound("pop"); go("chon", { day: 0, picks: emptyPicks() }); },
    "pick-man": function (el) { sound("pop"); setPick(S.day, "man", el.dataset.id); render(true); },
    "pick-rau": function (el) { sound("pop"); setPick(S.day, "rau", el.dataset.id); render(true); },
    "unpick-man": function () { setPick(S.day, "man", null); render(true); },
    "unpick-rau": function () { setPick(S.day, "rau", null); render(true); },
    next: function () {
      var t = S.picks[S.day];
      if (!t.man || !t.rau) return;
      sound("ting");
      if (S.day < days().length - 1) go("chon", { day: S.day + 1 });
      else go("xacnhan");
    },
    confirm: function () {
      var list = days().map(function (w, i) { return { ngay: addDays(startDate, i), man: S.picks[i].man, rau: S.picks[i].rau }; });
      save(list, false, function () { sound("ting"); go("dagui", { sentChanged: false }); });
    },
    wait: function () { go("chon", { day: 0, picks: emptyPicks() }); },
    "to-change": function () { go("doimon", { changeDay: 0, changeGroup: null, changed: false, changedDays: [], saveError: "" }); },
    retry: function () { location.reload(); },
    "tg-retry": function () { retryTelegram(); },
    notify: function () { enableNotify(); },
    "change-day": function (el) { update({ changeDay: Number(el.dataset.i), changeGroup: null }); },
    "change-man": function () { go("doimon", { changeGroup: "man" }); },
    "change-rau": function () { go("doimon", { changeGroup: "rau" }); },
    "cancel-change": function () { update({ changeGroup: null }); },
    "change-pick": function (el) {
      var cd = Math.min(S.changeDay, days().length - 1), g = S.changeGroup, id = el.dataset.id;
      if (S.picks[cd][g] === id) { go("doimon", { changeGroup: null }); return; }
      sound("pop");
      setPick(cd, g, id);
      var cds = S.changedDays.indexOf(cd) >= 0 ? S.changedDays : S.changedDays.concat([cd]);
      go("doimon", { changeGroup: null, changed: true, changedDays: cds });
    },
    resend: function () {
      if (!S.changed) return;
      var list = S.changedDays.map(function (i) { return { ngay: addDays(startDate, i), man: S.picks[i].man, rau: S.picks[i].rau }; });
      save(list, true, function () { sound("ting"); go("dagui", { sentChanged: true, changeGroup: null }); });
    },
    keep: function () {
      /* Bỏ các thay đổi chưa gửi: lấy lại món đã lưu. */
      go("dagui", { changeGroup: null, picks: S.savedPicks ? copyPicks(S.savedPicks) : S.picks, saveError: "" });
    }
  };

  /* Pháo giấy bắn ra từ chỗ chạm mỗi khi bấm một nút đang bật. */
  app.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || b.disabled) return;
    var root = app.getBoundingClientRect();
    var x = e.clientX || e.clientY ? e.clientX - root.left : b.getBoundingClientRect().left + b.offsetWidth / 2 - root.left;
    var y = e.clientX || e.clientY ? e.clientY - root.top : b.getBoundingClientRect().top + b.offsetHeight / 2 - root.top;
    confettiAt(x, y);
  }, true);

  screenEl.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    var fn = ACTIONS[el.dataset.act];
    if (fn) fn(el);
  });

  muteBtn.addEventListener("click", function () { S.muted = !S.muted; drawMute(); });

  /* ---------- Khởi động: đọc 20 món từ data/mon-an.json ---------- */
  /* ---------- 10 phút không dùng = đóng app ----------
     App web không tự tắt được trên iPhone, nên khi Yến không chạm vào app 10 phút
     (hoặc để app chạy nền quá 10 phút), lần chạm/mở tiếp theo app tải lại từ đầu:
     như vừa mở app mới, ảnh nền được xáo lại. Đang lưu thì không tải lại. */
  var IDLE_MS = 10 * 60 * 1000;
  var lastActive = Date.now();
  function restartIfIdle() {
    if (Date.now() - lastActive >= IDLE_MS && !S.saving) { location.reload(); return true; }
    lastActive = Date.now();
    return false;
  }
  ["pointerdown", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (restartIfIdle()) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") restartIfIdle();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) restartIfIdle(); });
  /* Đang mở mà để yên 10 phút: tự tải lại luôn. */
  setInterval(function () {
    if (document.visibilityState === "visible" && Date.now() - lastActive >= IDLE_MS && !S.saving) location.reload();
  }, 30 * 1000);

  drawHearts();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(function () {
      /* Đã bật thông báo từ trước: gửi lại đăng ký cho chắc (iPhone đôi khi đổi địa chỉ). */
      if ("Notification" in window && Notification.permission === "granted" && "PushManager" in window) {
        syncSubscription().catch(function (err) { console.warn("Đồng bộ thông báo lỗi:", err); });
      }
    }).catch(function (err) { console.warn("Không đăng ký được sw.js:", err); });
  }
  drawMute();
  function copyPicks(p) { return p.map(function (x) { return { man: x.man, rau: x.rau }; }); }

  /* Gọi máy chủ (Netlify Function), máy chủ mới ghi/đọc Supabase. */
  function api(method, query, body, path) {
    return fetch((path || API) + (query || ""), {
      method: method,
      cache: "no-store",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.loi || "Máy chủ lỗi " + r.status);
        return j;
      });
    });
  }

  /* Thêm ngày đầu/cuối của đợt để máy chủ soạn tin Telegram cho đủ các ngày. */
  function batchRange(body) {
    body.tu = startDate;
    body.den = addDays(startDate, days().length - 1);
    return body;
  }

  /* Telegram lỗi lần trước: chỉ gửi lại, không lưu gì thêm. */
  function retryTelegram() {
    if (S.saving) return;
    update({ saving: true });
    api("POST", "", batchRange({ chi_gui: true, doi: S.sentChanged }))
      .then(function (j) { return j.telegram && !j.telegram.ok ? j.telegram.loi || "lỗi không rõ" : ""; },
            function (err) { return err.message; })
      .then(function (loi) {
        if (!loi) sound("ting");
        update({ saving: false, tgError: loi });
      });
  }

  function save(list, doi, done) {
    if (S.saving) return;
    update({ saving: true, saveError: "" });
    api("POST", "", batchRange({ ngay: list, doi: doi }))
      .then(function (j) {
        S.saving = false;
        S.savedPicks = copyPicks(S.picks);
        S.tgError = j.telegram && !j.telegram.ok ? j.telegram.loi || "lỗi không rõ" : "";
        done();
      })
      .catch(function (err) {
        update({ saving: false, saveError: "Chưa lưu được, Vợ bấm lại nhé. (" + err.message + ")" });
      });
  }

  /* Ngày đi chợ: đọc 3 ngày trước đợt (cho "Vừa ăn") và các ngày của đợt (nếu đã chốt rồi).
     Ngày khác: đọc món của hôm nay. */
  function loadMeals() {
    if (S.screen === "homnay") {
      return api("GET", "?tu=" + todayStr + "&den=" + todayStr).then(function (j) {
        TODAY_MEAL = j.ngay && j.ngay[0] ? j.ngay[0] : null;
      });
    }
    var n = days().length;
    return api("GET", "?tu=" + addDays(startDate, -3) + "&den=" + addDays(startDate, n - 1)).then(function (j) {
      var batch = [];
      HISTORY = [];
      (j.ngay || []).forEach(function (r) {
        var off = dayDiff(r.ngay, startDate);
        if (off < 0) HISTORY.push({ ago: -off, ids: [r.man, r.rau] });
        else if (off < n) batch[off] = { man: r.man, rau: r.rau };
      });
      var full = batch.length === n && batch.every(function (p) { return p && BYID[p.man] && BYID[p.rau]; });
      if (full) {
        /* Đợt này đã chốt rồi: mở thẳng màn "Đã gửi" để Vợ đổi món nếu muốn, không chọn lại từ đầu. */
        S.picks = batch;
        S.savedPicks = copyPicks(batch);
        S.screen = "dagui";
      }
    });
  }

  function showLoadError(msg) {
    drawBg("chao");
    screenEl.innerHTML = '<div class="page error"><div class="glass box"><h1 class="title-lg">Chưa tải được dữ liệu</h1>' +
      '<p class="muted">Kiểm tra mạng rồi thử lại nhé. (' + esc(msg) + ")</p></div>" +
      '<div class="center">' + btn("Thử lại", "retry", "primary", "pill") + "</div></div>";
  }

  /* Danh sách ảnh/âm thanh: thiếu hoặc lỗi cũng không sao, app vẫn chạy với khung màu. */
  var resReady = fetch("data/tai-nguyen.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (j) {
      RES = { nen: j.nen || [], mon: j.mon || {}, am_thanh: j.am_thanh || {} };
      shuffleBackgrounds();
    });
  Promise.all([fetch("data/mon-an.json", { cache: "no-cache" }), resReady])
    .then(function (res) { var r = res[0]; if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (list) {
      DISHES = list;
      list.forEach(function (d) { BYID[d.id] = d; });
      return loadMeals();
    })
    .then(function () { render(false); })
    .catch(function (err) { showLoadError(err.message); });
})();
