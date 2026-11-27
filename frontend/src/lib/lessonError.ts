// Nhận ra lỗi quen thuộc trong lessons.error (do worker ghi) để hiện câu dễ hiểu thay vì lỗi thô tiếng Anh.
// Máy chủ chạy worker (GitHub Actions) bị YouTube chặn với thông báo "Sign in to confirm you're not a bot".
export function isYoutubeBlocked(error: string | null | undefined): boolean {
  return !!error && /not a bot|sign in to confirm/i.test(error);
}
