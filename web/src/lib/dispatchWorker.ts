import "server-only";

// Gọi GitHub Actions chạy worker ngay (workflow .github/workflows/worker.yml).
// Thiếu biến môi trường hoặc gọi lỗi thì bỏ qua: lịch chạy mỗi giờ của workflow vẫn sẽ nhận bài.
export async function dispatchWorker(): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // dạng "chủ-sở-hữu/tên-repo"
  if (!token || !repo) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/worker.yml/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: process.env.GITHUB_REF_NAME || "main" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("dispatchWorker:", res.status, await res.text());
  } catch (e) {
    console.error("dispatchWorker:", e);
  }
}
