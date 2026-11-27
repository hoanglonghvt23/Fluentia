import assert from "node:assert/strict";
import { test } from "node:test";
import { compare } from "./diff.ts";

test("đúng hoàn toàn dù khác hoa thường và dấu câu", () => {
  const r = compare("Hello, World! It's me.", "hello world it's me");
  assert.equal(r.score, 1);
  assert.ok(r.tokens.every((t) => t.status === "ok"));
});

test("thiếu từ và thừa từ", () => {
  const r = compare("I like green apples", "I like big apples");
  assert.deepEqual(r.tokens.filter((t) => t.status !== "ok").map((t) => [t.word, t.status]).sort(),
    [["big", "extra"], ["green", "missing"]]);
  assert.equal(r.score, 3 / 4);
});

test("câu trả lời rỗng được 0 điểm", () => {
  assert.equal(compare("Hi there", "").score, 0);
});
