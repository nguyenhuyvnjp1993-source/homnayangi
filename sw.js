/* File chạy nền của app (chặng C4): chỉ để nhận thông báo 16:00 / 16:15.
   Cố ý KHÔNG lưu bản sao app (không có "fetch"), nên app luôn lấy bản mới nhất từ Netlify. */

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Mình ăn gì thế, Vợ ơi", {
    body: d.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    data: { url: d.url || "./" }
  }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ("navigate" in list[i]) return list[i].navigate(url).then(function (c) { return c && c.focus(); });
    }
    return self.clients.openWindow(url);
  }));
});
