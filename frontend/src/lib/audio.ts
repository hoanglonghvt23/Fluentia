export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Phát đoạn [start, end] của một file âm thanh rồi dừng. Đặt cancel.v = true để hủy.
export function playSegment(a: HTMLAudioElement, start: number, end: number, rate: number, cancel: { v: boolean }) {
  return new Promise<void>((resolve) => {
    a.currentTime = start;
    a.playbackRate = rate;
    a.play().catch(() => resolve());
    const timer = setInterval(() => {
      if (cancel.v || a.currentTime >= end || a.ended) {
        clearInterval(timer);
        a.pause();
        resolve();
      }
    }, 40);
  });
}
