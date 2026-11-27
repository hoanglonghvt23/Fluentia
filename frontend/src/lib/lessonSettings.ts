// Tùy chỉnh của một bài học, lưu ở cột lessons.settings (jsonb).
export type LessonSettings = {
  maxSentences: number | null; // chỉ lấy tối đa ngần này câu đầu (null = không giới hạn)
  maxWords: number | null; // tổng số chữ tối đa của cả bài (null = không giới hạn)
  showInput: boolean; // Dictation có ô nhập để hệ thống chấm hay chỉ nghe
};

export const DEFAULT_SETTINGS: LessonSettings = {
  maxSentences: null,
  maxWords: null,
  showInput: true,
};

// Số nguyên dương hoặc null (ô để trống).
export function posInt(v: unknown): number | null {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Đọc settings từ DB, bỏ giá trị hỏng và điền mặc định cho phần còn thiếu.
export function readSettings(raw: unknown): LessonSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    maxSentences: posInt(r.maxSentences),
    maxWords: posInt(r.maxWords),
    showInput: r.showInput === false ? false : true,
  };
}
