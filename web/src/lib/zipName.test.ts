import assert from "node:assert/strict";
import { test } from "node:test";
import { zipFileName } from "./zipName.ts";

test("zipFileName luôn bắt đầu bằng Fluteria và kết thúc .zip", () => {
  assert.equal(zipFileName("Test Podcast"), "Fluteria_Test Podcast.zip");
});

test("zipFileName bỏ ký tự không hợp lệ và xử lý tên rỗng hoặc quá dài", () => {
  assert.equal(zipFileName('a/b\\c:d*e?"f<g>h|i'), "Fluteria_a_b_c_d_e__f_g_h_i.zip");
  assert.equal(zipFileName("   "), "Fluteria_lesson.zip");
  assert.equal(zipFileName("x".repeat(200)), `Fluteria_${"x".repeat(80)}.zip`);
});
