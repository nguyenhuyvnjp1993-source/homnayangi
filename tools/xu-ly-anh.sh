#!/usr/bin/env bash
# Chặng C5: nén ảnh Huy tải lên và tạo danh sách cho app (data/tai-nguyen.json).
# Claude chạy file này mỗi khi Huy thêm/đổi ảnh. Cần ImageMagick (lệnh `convert`).
#
#   assets/nen/<tên bất kỳ>.jpg|png|webp  → img/nen/1.jpg, 2.jpg, …  (ảnh nền, rộng 900 px)
#   assets/mon/<mã món>.jpg|png|webp      → img/mon/<mã món>.jpg      (ảnh món, vuông 600×600)
#   assets/pop.mp3, assets/ting.mp3       → dùng thẳng nếu có
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f img/nen/*.jpg img/mon/*.jpg
nen=()
i=0
while IFS= read -r f; do
  i=$((i + 1))
  convert "$f" -auto-orient -resize '900x>' -strip -sampling-factor 4:2:0 -quality 78 -interlace JPEG "img/nen/$i.jpg"
  nen+=("\"img/nen/$i.jpg\"")
done < <(find assets/nen -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) | sort)

mon=()
while IFS= read -r f; do
  id=$(basename "${f%.*}" | tr '[:lower:]' '[:upper:]')
  [[ "$id" =~ ^[A-Z][0-9]{1,2}$ ]] || { echo "Bỏ qua $f (tên phải là mã món, ví dụ M1.jpg)"; continue; }
  convert "$f" -auto-orient -resize '600x600^' -gravity center -extent 600x600 -strip -sampling-factor 4:2:0 -quality 80 -interlace JPEG "img/mon/$id.jpg"
  mon+=("\"$id\": \"img/mon/$id.jpg\"")
done < <(find assets/mon -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) | sort)

am() { [[ -f "assets/$1.mp3" ]] && echo "\"assets/$1.mp3\"" || echo null; }
join() { local IFS=","; echo "$*"; }

cat > data/tai-nguyen.json <<JSON
{
  "_ghi_chu": "File này do tools/xu-ly-anh.sh tạo ra, không sửa tay.",
  "nen": [$(join "${nen[@]+"${nen[@]}"}")],
  "mon": {$(join "${mon[@]+"${mon[@]}"}")},
  "am_thanh": { "pop": $(am pop), "ting": $(am ting) }
}
JSON
node -e 'JSON.parse(require("fs").readFileSync("data/tai-nguyen.json"))'
echo "Ảnh nền: ${#nen[@]} · Ảnh món: ${#mon[@]}"
du -ch img/nen/*.jpg img/mon/*.jpg 2>/dev/null | tail -1 || true
