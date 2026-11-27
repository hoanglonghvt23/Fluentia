import assert from "node:assert/strict";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { parseCsv, parseLessonZip } from "./lessonZip.ts";

test("parseCsv xử lý BOM, ngoặc kép, dấu phẩy và xuống dòng trong ô", () => {
  const rows = parseCsv('﻿"a","b,c"\r\n"x ""y""","line1\nline2"\r\n');
  assert.deepEqual(rows, [["a", "b,c"], ['x "y"', "line1\nline2"]]);
});

const build = (extra: Record<string, Uint8Array> = {}) =>
  zipSync({
    "lesson.json": strToU8(JSON.stringify({ title: "Bài thử", source_type: "youtube", source_url: "https://youtu.be/x", duration_sec: 12.5, settings: { maxWords: 100 } })),
    "audio.mp3": new Uint8Array([1, 2, 3]),
    "sentences.json": strToU8(JSON.stringify([
      { index: 0, start: 0, end: 2, text: "Hello there." },
      { index: 1, start: 2, end: 2, text: "bad range" },
      { index: 2, start: 3, end: 5, text: "  Nice to meet you.  " },
    ])),
    "dictation_history.csv": strToU8('﻿"time","sentence_no","sentence","answer","score"\r\n"2026-01-02T03:04:05.000Z","2","Nice, to meet you.","nice to meet you","0.9"\r\n"bad","x","","",""\r\n'),
    "recordings/001.webm": new Uint8Array([9, 9]),
    "recordings.json": strToU8(JSON.stringify([
      { file: "recordings/001.webm", sentence_index: 1, start: 3, end: 5, text: "Nice to meet you.", mime: "audio/webm", created_at: "2026-01-02T03:04:05.000Z" },
      { file: "recordings/missing.webm", sentence_index: 0, start: 0, end: 2, text: "x", mime: "audio/webm", created_at: "2026-01-02T03:04:05.000Z" },
    ])),
    ...extra,
  });

test("parseLessonZip đọc đủ thông tin và bỏ câu/dòng hỏng", () => {
  const r = parseLessonZip(build());
  assert.equal(r.title, "Bài thử");
  assert.equal(r.sourceType, "youtube");
  assert.equal(r.duration, 12.5);
  assert.deepEqual(r.sentences.map((s) => [s.idx, s.text]), [[0, "Hello there."], [1, "Nice to meet you."]]);
  assert.equal(r.attempts.length, 1);
  assert.equal(r.attempts[0].sentenceIdx, 1);
  assert.equal(r.attempts[0].sentenceText, "Nice, to meet you.");
  assert.equal(r.audio.ext, "mp3");
  assert.equal(r.recordings.length, 1); // bản ghi thiếu file bị bỏ qua
  assert.equal(r.recordings[0].sentenceIdx, 1);
  assert.equal(r.recordings[0].ext, "webm");
  assert.deepEqual([...r.recordings[0].data], [9, 9]);
});

test("parseLessonZip báo lỗi khi file không phải zip hoặc thiếu file", () => {
  assert.throws(() => parseLessonZip(new Uint8Array([1, 2, 3])), /zip/);
  assert.throws(() => parseLessonZip(zipSync({ "x.txt": strToU8("x") })), /missing:lesson\.json/);
});
