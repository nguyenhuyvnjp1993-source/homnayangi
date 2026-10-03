Huy đặt file gốc vào đây (tải lên bằng GitHub → Add file → Upload files):
- logo.png: logo app (ảnh vuông)
- nen/: ảnh nền các màn hình (tên gì cũng được, nên có 6 ảnh; app xáo thứ tự mỗi lần mở)
- mon/: ảnh món, tên đúng mã món: M1.jpg, R4.png, N2.jpg… (câu lệnh tạo ảnh: docs/prompt-anh-mon.md)
- pop.mp3 (khi chọn món), ting.mp3 (khi chốt): không có thì app dùng âm thanh tạo bằng code

Xong thì nhờ Claude chạy tools/xu-ly-anh.sh để nén ảnh vào img/ và cập nhật data/tai-nguyen.json.
