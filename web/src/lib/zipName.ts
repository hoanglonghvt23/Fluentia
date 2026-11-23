// Mọi file zip tải từ hệ thống đều bắt đầu bằng "Fluentia" để người dùng biết file đến từ đâu.
export const ZIP_PREFIX = "Fluentia";

export function zipFileName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim().slice(0, 80) || "lesson";
  return `${ZIP_PREFIX}_${clean}.zip`;
}
