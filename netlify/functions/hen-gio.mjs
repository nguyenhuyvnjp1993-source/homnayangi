// Hàm hẹn giờ của Netlify (Scheduled Function), chạy 07:00, 07:15, 07:30 giờ UTC
// = 16:00, 16:15, 16:30 giờ Nhật. Việc cụ thể ở netlify/lib/hen-gio.mjs.
// Xem kết quả mỗi lần chạy: Netlify → Logs → Functions → hen-gio.

import { runStep, stepNow } from "../lib/hen-gio.mjs";

export default async () => {
  const buoc = stepNow();
  if (!buoc) {
    console.log("Không phải 16:00–16:30 giờ Nhật, bỏ qua");
    return;
  }
  try {
    console.log(JSON.stringify(await runStep(buoc, {})));
  } catch (e) {
    console.error("Lỗi bước " + buoc + ":", e);
  }
};

export const config = { schedule: "0,15,30 7 * * *" };
