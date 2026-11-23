import assert from "node:assert/strict";
import { test } from "node:test";
import { zipFileName } from "./zipName.ts";

test("zipFileName luôn bắt đầu bằng Fluentia và kết thúc .zip", () => {
  assert.equal(zipFileName("Test Podcast"), "Fluentia_Test Podcast.zip");
});

test("zipFileName bỏ ký tự không hợp lệ và xử lý tên rỗng hoặc quá dài", () => {
  assert.equal(zipFileName('a/b\\c:d*e?"f<g>h|i'), "Fluentia_a_b_c_d_e__f_g_h_i.zip");
  assert.equal(zipFileName("   "), "Fluentia_lesson.zip");
  assert.equal(zipFileName("x".repeat(200)), `Fluentia_${"x".repeat(80)}.zip`);
});
