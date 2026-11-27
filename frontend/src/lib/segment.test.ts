import assert from "node:assert/strict";
import { test } from "node:test";
import { limitSentences, segment } from "./segment.ts";

test("giới hạn số câu và tổng số chữ", () => {
  const list = ["one two three", "four five", "six seven eight nine", "ten"].map((text, i) => ({ start: i, end: i + 1, text }));
  assert.equal(limitSentences(list, {}).length, 4);
  assert.equal(limitSentences(list, { maxSentences: 2 }).length, 2);
  assert.equal(limitSentences(list, { maxWords: 6 }).length, 2); // 3 + 2 = 5, câu thứ ba làm vượt 6
  assert.equal(limitSentences(list, { maxWords: 1 }).length, 1); // luôn giữ câu đầu
  assert.equal(limitSentences(list, { maxSentences: 3, maxWords: 100 }).length, 3);
});

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

test("phụ đề có dấu câu: khoảng lặng giữa hai cue không cắt câu giữa chừng", () => {
  const s = segment([
    { start: 8, end: 9.6, text: "On the" },
    { start: 21, end: 26, text: "nature called I went to the camp." },
  ]);
  assert.deepEqual(s.map((x) => x.text), ["On the nature called I went to the camp."]);
});

test("câu kết thúc ở dấu chấm dù khoảng lặng nằm trước chữ cuối của câu", () => {
  const s = segment([
    { start: 37.76, end: 42.24, text: "Listen and see if your day is the" },
    { start: 43.32, end: 48.05, text: "same. Talking about daily life." },
  ]);
  assert.deepEqual(s.map((x) => x.text), ["Listen and see if your day is the same.", "Talking about daily life."]);
  assert.ok(s[0].end < s[1].start, "chỗ nghỉ sau dấu chấm nằm giữa hai câu");
});

test("phụ đề không dấu câu: khoảng lặng dài vẫn ngắt câu", () => {
  const s = segment([
    { start: 8, end: 9.6, text: "On the nature called I went to the" },
    { start: 21, end: 26, text: "camp and then I came back home" },
  ]);
  assert.equal(s.length, 2);
  assert.equal(s[1].start, 21);
});

test("lời hát không dấu câu: ngắt ở chỗ nghỉ nhẹ nhưng không vụn thành câu 2-3 chữ", () => {
  const cues = [
    { start: 0, end: 3, text: "What came out was thick and brown and sweet" },
    { start: 3.8, end: 5, text: "Creamy golden brown" },
    { start: 5.1, end: 6, text: "peanut butter" },
    { start: 6.8, end: 8, text: "Running down my feet" },
  ];
  const s = segment(cues, { maxChars: 140, minChars: 30 });
  assert.equal(s[0].text, "What came out was thick and brown and sweet");
  assert.ok(s.every((x) => x.text.length >= 20), JSON.stringify(s.map((x) => x.text)));
});

test("câu ngắn không bị gộp qua khoảng lặng quá dài hay vượt maxChars", () => {
  const far = segment([
    { start: 0, end: 1, text: "Yes." },
    { start: 10, end: 12, text: "I think so, really." },
  ], { minChars: 30 });
  assert.equal(far.length, 2);
  const big = segment([{ start: 0, end: 6, text: "Hi. This is a fairly long second sentence here." }], { minChars: 30, maxChars: 20 });
  assert.ok(big.every((x) => x.text.length <= 48) && big.length >= 2);
});

test("minChars gộp câu ngắn vào câu sau", () => {
  const s = segment([{ start: 0, end: 4, text: "Yes. I think so." }], { minChars: 10 });
  assert.equal(s.length, 1);
});
