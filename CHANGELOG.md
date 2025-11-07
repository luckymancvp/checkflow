# Changelog

## [Chưa phát hành] - 2025-01-08

### Đã thêm
- **Tính năng Goto Order trong màn hình Review được cải tiến**
  - Khi sử dụng chức năng "goto order", hệ thống sẽ tải lại dữ liệu mới nhất từ Google Sheet cho order item đó
  - Hiển thị ngay lập tức thông tin order đã lưu, sau đó tải dữ liệu mới từ sheet ở background
  - Icon sync xoay vòng hiển thị khi đang tải dữ liệu từ sheet
  - Phát hiện và hiển thị các thay đổi giữa dữ liệu cũ và mới
  - Thông báo chi tiết các trường dữ liệu đã thay đổi (giá trị cũ gạch ngang, giá trị mới in đậm)
  - Thông báo thay đổi không tự động ẩn, người dùng có thể đóng bằng nút X khi muốn

### Cải thiện
- Vô hiệu hóa input và nút Go trong khi đang tải dữ liệu để tránh request trùng lặp
- UX mượt mà hơn khi chuyển đổi giữa các order với feedback rõ ràng về trạng thái loading
