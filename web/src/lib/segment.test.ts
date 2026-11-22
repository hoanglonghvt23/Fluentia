import assert from "node:assert/strict";
import { test } from "node:test";
import { segment } from "./segment.ts";

test("tách theo dấu kết câu và giữ mốc thời gian", () => {
  const s = segment([
    { start: 0, end: 2, text: "Hello there. How are" },
    { start: 2, end: 4, text: "you today?" },
  ]);
  assert.deepEqual(s.map((x) => x.text), ["Hello there.", "How are you today?"]);
  assert.equal(s[0].start, 0);
  assert.equal(s[1].end, 4);
  assert.ok(s[0].end > 0 && s[0].end < 4);
});

test("không tách sau từ viết tắt", () => {
  const s = segment([{ start: 0, end: 3, text: "Mr. Smith lives in the U.S. now." }]);
  assert.equal(s.length, 1);
});

test("văn bản không dấu câu bị cắt theo maxChars", () => {
  const text = Array(40).fill("word").join(" ");
  const s = segment([{ start: 0, end: 20, text }], { maxChars: 50 });
  assert.ok(s.length > 1);
  assert.ok(s.every((x) => x.text.length <= 50));
});

test("minChars gộp câu ngắn vào câu sau", () => {
  const s = segment([{ start: 0, end: 4, text: "Yes. I think so." }], { minChars: 10 });
  assert.equal(s.length, 1);
});
