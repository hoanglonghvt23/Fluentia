# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Fluentia: web luyện tiếng Anh (Dictation và Shadowing)

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

## Lệnh thường dùng
Máy phát triển là Windows (PowerShell). Cần Node 26 (test chạy file `.ts` trực tiếp) và ffmpeg trong PATH (`winget install Gyan.FFmpeg`).

Web (`web/`):
- `npm run dev` · `npm run build` · `npm run lint` · `npm test`
- Một file test: `node --test src/lib/segment.test.ts` (thêm `--test-name-pattern="<tên>"` để chạy một test). Test nằm cạnh mã ở `src/lib/*.test.ts` và import nhau kèm đuôi `.ts`.
- Không chạy `npm run build` khi `npm run dev` đang mở: cả hai dùng chung `.next` nên máy chủ dev sẽ phục vụ bản lỗi.

Worker (`worker/`, dùng `.venv` riêng):
- `.\.venv\Scripts\python main.py` chạy vòng lặp xử lý; `--check` chỉ thử kết nối Supabase.
- `.\.venv\Scripts\python test_worker.py` (phụ đề, ffmpeg, gom từ); thêm `--whisper` để chạy cả nhận dạng giọng nói (tải model ~500 MB lần đầu).

Cơ sở dữ liệu: không dùng Supabase CLI. Chạy tay từng file `supabase/migrations/000N_*.sql` theo thứ tự trong SQL Editor. Admin đầu tiên tạo thủ công: Authentication > Add user `admin@fluteria.local`, rồi `update public.profiles set role = 'admin' where username = 'admin';`.

Biến môi trường: `web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` chỉ dùng phía máy chủ) và `worker/.env` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`). Mẫu ở `.env.example` trong mỗi thư mục.

## Kiến trúc
Ba phần giao tiếp qua Supabase, không gọi trực tiếp nhau:

- **Hàng đợi là chính bảng `lessons`.** Web tạo bài với `status='queued'`; worker (chạy trên máy cá nhân) poll mỗi 5 giây, nhận việc bằng `update ... where status='queued'` rồi xử lý và ghi `ready` hoặc `error`. Trang web tự làm mới (`AutoRefresh`) khi còn bài đang chờ. Worker khởi động sẽ xếp lại các bài kẹt ở `processing`.
- **Tải file đi thẳng từ trình duyệt lên Storage** (bucket `media`, quyền theo thư mục `<user_id>/...`, tối đa 50 MB của gói Free), không qua API của Vercel. Id bài học do trình duyệt sinh trước khi upload.
- **Worker chỉ ghi `lessons.cues`** (phụ đề thô `[{start,end,text}]`) và `audio_path`, rồi xóa video gốc. **Việc tách câu nằm ở web**: `lib/segment.ts` (hàm thuần, có test) biến cues thành câu, `lib/sentences.ts` ghi bảng `sentences` và áp giới hạn số câu/số chữ trong `lessons.settings` (jsonb, đọc qua `lib/lessonSettings.ts`). Mở bài ở trạng thái `ready` mà chưa có câu thì trang tự tách lần đầu. "Nhận dạng lại" = đặt `cues=null, status='queued'` trên bài đã có âm thanh; worker có nhánh riêng chỉ chạy lại Whisper.
- **Nhận dạng giọng nói** (`worker/media.py`): hai lượt Whisper rồi ghép. Lượt chính tắt VAD (VAD mặc định làm mất hơn 60% chữ ở bài có nhạc nền); lượt phụ dùng VAD nhẹ để vá các khoảng trống dài (`fill_gaps`). Mốc giờ lấy theo từng từ rồi gom lại (`words_to_cues`). YouTube chỉ lấy phụ đề do người đăng tải, không lấy phụ đề tự động. `truststore` cho Python dùng kho chứng chỉ Windows (máy có phần mềm quét HTTPS làm hỏng chứng chỉ mặc định).
- **Phát âm thanh**: mỗi bài một file mp3; trình duyệt nhảy theo mốc thời gian bằng `lib/audio.ts` (`playSegment`), không cắt file theo câu. URL ký sẵn hết hạn sau 3 giờ.
- **Đăng nhập**: username ghép thành `username@fluteria.local` để dùng Supabase Auth (tên miền giả này giữ nguyên dù hệ thống đã đổi tên thành Fluentia, vì đổi sẽ làm các tài khoản hiện có không đăng nhập được); trigger tạo dòng `profiles` (có cột `role`). `src/proxy.ts` (tên mới của middleware trong Next 16) làm mới phiên và chuyển người chưa đăng nhập về `/login`. Mọi bảng bật RLS theo chủ sở hữu. Chỉ `lib/supabase/admin.ts` (`import "server-only"`, dùng secret key) bỏ qua RLS, và chỉ được gọi sau khi `requireAdmin()` kiểm tra vai trò (trang `/admin`).
- **Lịch sử và bản ghi** (`attempts`, `recordings`) lưu bản chụp chữ của câu và để `sentence_id` về null khi câu bị xóa, nên sửa hay tách lại câu không làm mất lịch sử. Bản ghi Shadowing gắn với câu gốc và `start_sec/end_sec` để chừa chỗ cho module chấm phát âm sau này.
- **Đa ngôn ngữ**: next-intl theo cookie `locale`, không có tiền tố URL (`src/i18n/request.ts`). `messages/vi.json` và `messages/en.json` phải có đúng cùng bộ khóa; component client dùng được nhờ `NextIntlClientProvider` trong `app/layout.tsx`.
- **Next 16**: `cacheComponents` được tắt có chủ đích, vì mọi trang đều đọc cookie đăng nhập. `web/AGENTS.md` yêu cầu đọc `node_modules/next/dist/docs/` trước khi dùng API Next vì có thay đổi lớn so với các bản trước.
- **Giao diện**: token màu, nút (`.btn`), thẻ (`.card`), ô nhập (`.field`) định nghĩa dùng chung trong `app/globals.css` (nền kem, điểm nhấn đất nung, có chế độ tối); component dùng lại các lớp này thay vì tự viết kiểu.

## Đã chốt
- Nền tảng: web (không làm app tải về). Hạ tầng: Vercel và Supabase.
- Ngôn ngữ học: tiếng Anh, chuẩn phát âm Mỹ (dùng khi làm phần chấm phát âm sau này).
- Nguồn video: link YouTube hoặc file tải lên.
- Phụ đề: dùng phụ đề có sẵn (định dạng tiêu chuẩn). Nếu không có thì tách từ âm thanh bằng Whisper. Cả hai làm ngay trong phiên bản đầu.
- Dictation (làm đầy đủ): tách phụ đề thành câu, phát bằng âm thanh gốc của video, chỉnh tốc độ đọc, số lần đọc từng câu, khoảng ngắt giữa các câu.
- Shadowing (rút gọn): tách và chỉnh câu, có micro để ghi âm, nghe lại bản ghi của mình. Bản ghi lưu đến khi người dùng tự xóa. Chưa giới hạn dung lượng.
- Đăng nhập/đăng xuất bằng username và password.
- Phải có cách sửa mật khẩu khi quên: người dùng tự sửa hoặc tài khoản admin sửa giúp.
- Lưu tiến độ và lịch sử học.
- Công nghệ (chốt ở giai đoạn 0): web/ dùng Next.js (App Router, TypeScript, Tailwind), Node 26 LTS. worker/ dùng Python với venv và requirements.txt. Triển khai: Vercel nối với GitHub (Root Directory = web), tự deploy khi push.
- Quên mật khẩu: chỉ admin đặt lại (trang /admin). Không có đăng ký công khai, admin tạo tài khoản.
- Giao diện: cả tiếng Việt và tiếng Anh, có nút chuyển (next-intl, lưu cookie).
- Whisper: model small chạy bằng CPU (faster-whisper) trên máy worker (15,8 GB RAM, không GPU rời).
- Phụ đề tự động của YouTube KHÔNG tính là phụ đề có sẵn: chỉ dùng phụ đề do người đăng tải, nếu không có thì dùng Whisper.
- Lưu trữ: chỉ lưu âm thanh (worker tách rồi xóa video), dùng Supabase 1 GB. File tải lên tối đa 50 MB (giới hạn gói Free).
- Tùy chỉnh chọn lúc tạo bài: chế độ Dictation có hoặc không ô nhập, số câu tối đa (mặc định 20) và tổng số chữ tối đa (mặc định 300; để trống là lấy cả bài). Công tắc Phụ đề (ẩn/hiện) có ở Dictation và Shadowing.
- Độ dài mỗi câu KHÔNG cho người dùng chọn (người dùng thấy câu bị cắt giữa chừng): chỉ có giới hạn nội bộ 300 ký tự và gộp câu dưới 30 ký tự trong `lib/sentences.ts`.
- Người dùng đã duyệt làm gộp Giai đoạn 2 đến 6 rồi kiểm tra một lần (bỏ quy tắc dừng sau mỗi giai đoạn cho đợt đó). Từ nay vẫn theo quy tắc làm từng bước và chờ duyệt, trừ khi người dùng nói khác.

## Hoãn lại (CHƯA làm ở phiên bản đầu)
- Kiểm tra phát âm và ngữ điệu của người dùng so với câu được chọn (ngữ điệu so với âm thanh gốc của video).
- Gợi ý sửa lỗi bằng ký tự IPA cho từng từ phát âm sai.
  Hãy chừa sẵn chỗ: bản ghi âm phải gắn với câu gốc và mốc thời gian; phần chấm sau này là một module có thể thêm vào.

## Chưa chốt (hỏi người dùng trước khi làm phần liên quan)
- Hiện không còn điểm nào chưa chốt.

## Lộ trình
Giai đoạn 0 đến 6 đã viết xong và commit; chưa push và chưa kiểm tra đầy đủ với Supabase thật.
0. Khung dự án: web/ và worker/, kết nối Supabase, triển khai bản trống lên Vercel.
1. Đăng nhập, vai trò admin/thường, trang quản trị đặt lại mật khẩu.
2. Bài học từ file tải lên: tách câu, màn hình chỉnh câu.
3. Dictation.
4. Link YouTube và Whisper.
5. Shadowing: ghi âm, nghe lại, lưu, xóa.
6. Tiến độ, lịch sử, hoàn thiện giao diện điện thoại.

## Rủi ro cần nhớ
- yt-dlp hay hỏng khi YouTube thay đổi, cần cập nhật định kỳ (`pip install -U yt-dlp`).
- Whisper small nghe sai nhiều ở bài có nhạc nền hoặc giọng hát; lời hát không dấu câu cho ra câu dài.
- Supabase miễn phí chỉ có 1 GB lưu file và tạm dừng dự án sau khoảng một tuần không hoạt động.
- iPhone (Safari) ghi âm ở định dạng khác Chrome. Micro chỉ hoạt động trên HTTPS.
- Chế độ Dictation không có ô nhập không ghi điểm hay lịch sử nên không nhớ vị trí đã luyện.
