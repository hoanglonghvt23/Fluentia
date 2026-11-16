# Fluteria: web luyện tiếng Anh (Dictation và Shadowing)

## Mục tiêu
Web luyện tiếng Anh từ video, có 2 tính năng chính: Dictation (nghe chép chính tả) và Shadowing (nhại theo).
Phiên bản đầu dùng riêng cho 2 người. Thiết kế để sau này mở rộng tới 1000 người nếu public.

## Quy tắc làm việc (bắt buộc)
- Không tự quyết định các điểm chưa chốt (mục "Chưa chốt"). Gặp thì dừng lại và hỏi người dùng.
- Chỉ dùng công cụ miễn phí. Không dùng API hay model phải trả phí.
- Làm từng giai đoạn. Xong mỗi giai đoạn thì dừng, nói cách kiểm tra, chờ người dùng duyệt rồi mới làm tiếp.
- Không ghi khóa, mật khẩu, token vào code hay commit. Dùng biến môi trường và file .env (đã được .gitignore).
- Bảo mật không cần quá cao, nhưng mật khẩu phải được băm, không lưu dạng thô.
- Giao diện dùng tốt trên cả điện thoại và máy tính.
- Giải thích ngắn gọn bằng tiếng Việt.

## Đã chốt
- Nền tảng: web (không làm app tải về). Hạ tầng: Vercel và Supabase.
- Ngôn ngữ học: tiếng Anh, chuẩn phát âm Mỹ (dùng khi làm phần chấm phát âm sau này).
- Nguồn video: link YouTube hoặc file tải lên.
- Phụ đề: dùng phụ đề có sẵn (định dạng tiêu chuẩn). Nếu không có thì tách từ âm thanh bằng Whisper. Cả hai làm ngay trong phiên bản đầu.
- Dictation (làm đầy đủ): tách phụ đề thành câu, chỉnh độ dài câu, phát bằng âm thanh gốc của video, chỉnh tốc độ đọc, số lần đọc từng câu, khoảng ngắt giữa các câu.
- Shadowing (rút gọn): tách và chỉnh câu, có micro để ghi âm, nghe lại bản ghi của mình. Bản ghi lưu đến khi người dùng tự xóa. Chưa giới hạn dung lượng.
- Đăng nhập/đăng xuất bằng username và password.
- Phải có cách sửa mật khẩu khi quên: người dùng tự sửa hoặc tài khoản admin sửa giúp.
- Lưu tiến độ và lịch sử học.

## Hoãn lại (CHƯA làm ở phiên bản đầu)
- Kiểm tra phát âm và ngữ điệu của người dùng so với câu được chọn (ngữ điệu so với âm thanh gốc của video).
- Gợi ý sửa lỗi bằng ký tự IPA cho từng từ phát âm sai.
  Hãy chừa sẵn chỗ: bản ghi âm phải gắn với câu gốc và mốc thời gian; phần chấm sau này là một module có thể thêm vào.

## Chưa chốt (hỏi người dùng trước khi làm phần liên quan)
- Cấu hình máy chạy worker (RAM, GPU) để chọn kích cỡ Whisper. Cần trước giai đoạn 4.
- Phụ đề tự động của YouTube có tính là "phụ đề có sẵn" không. Cần trước giai đoạn 4.
- Lưu trữ: chỉ lưu âm thanh hay cả video; chấp nhận giới hạn 1 GB của Supabase hay dùng thêm kho khác. Cần trước giai đoạn 5.
- Quên mật khẩu: chỉ admin đặt lại, hay thêm mã khôi phục. Cần trước giai đoạn 1.
- Ngôn ngữ giao diện: tiếng Việt, tiếng Anh, hay cả hai. Cần trước giai đoạn 1.

## Kiến trúc đề xuất (người dùng chưa duyệt chính thức; hỏi trước khi chọn công nghệ cụ thể)
- Vercel: giao diện web và các API nhẹ. Đề xuất Next.js.
- Supabase: Postgres, lưu file (Storage), hàng đợi công việc.
- worker/ (Python) chạy trên máy tính của người dùng: yt-dlp, ffmpeg, Whisper. Worker chủ động đọc hàng đợi từ Supabase, không cần mở máy ra internet.
- Trình duyệt phát một file âm thanh gốc và nhảy theo mốc thời gian, không cắt file theo từng câu.
- Đăng nhập: username ghép thành email giả để dùng Supabase Auth; admin đặt lại mật khẩu bằng khóa quản trị phía máy chủ.

## Lộ trình
0. Khung dự án: web/ và worker/, kết nối Supabase, triển khai bản trống lên Vercel.
1. Đăng nhập, vai trò admin/thường, trang quản trị đặt lại mật khẩu.
2. Bài học từ file tải lên: tách câu, màn hình chỉnh câu.
3. Dictation.
4. Link YouTube và Whisper.
5. Shadowing: ghi âm, nghe lại, lưu, xóa.
6. Tiến độ, lịch sử, hoàn thiện giao diện điện thoại.

## Rủi ro cần nhớ
- yt-dlp hay hỏng khi YouTube thay đổi, cần cập nhật định kỳ.
- Phụ đề tự động của YouTube thiếu dấu câu nên tách câu kém chính xác.
- Supabase miễn phí chỉ có 1 GB lưu file và tạm dừng dự án sau khoảng một tuần không hoạt động.
- iPhone (Safari) ghi âm ở định dạng khác Chrome. Micro chỉ hoạt động trên HTTPS.