import assert from "node:assert/strict";
import { test } from "node:test";
import { isYoutubeBlocked } from "./lessonError.ts";

test("isYoutubeBlocked nhận ra lỗi YouTube chặn (cả dấu nháy cong)", () => {
  assert.equal(isYoutubeBlocked("ERROR: [youtube] abc: Sign in to confirm you’re not a bot. This helps protect our community."), true);
  assert.equal(isYoutubeBlocked("Sign in to confirm you're not a bot"), true);
});

test("isYoutubeBlocked không nhầm lỗi khác", () => {
  assert.equal(isYoutubeBlocked("Không nhận ra lời nói trong file này."), false);
  assert.equal(isYoutubeBlocked(null), false);
  assert.equal(isYoutubeBlocked(""), false);
});
