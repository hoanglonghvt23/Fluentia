import assert from "node:assert/strict";
import { test } from "node:test";
import { readTheme, themeInitScript, themeToVars } from "./theme.ts";

test("nền sáng cho chữ tối, nền tối cho chữ sáng", () => {
  assert.equal(themeToVars({ bg: "#ffffff" })["--foreground"], "#2a2420");
  assert.equal(themeToVars({ bg: "#101010" })["--foreground"], "#f1e9df");
  assert.equal(themeToVars({ bg: "#101010" })["color-scheme"], "dark");
});

test("màu nút sáng dùng chữ tối, màu nút tối dùng chữ trắng", () => {
  assert.equal(themeToVars({ accent: "#ffe08a" })["--accent-ink"], "#1b1714");
  assert.equal(themeToVars({ accent: "#1a3d8f" })["--accent-ink"], "#ffffff");
});

test("giá trị sai hoặc rỗng bị bỏ qua, phông mặc định không ghi đè", () => {
  assert.deepEqual(themeToVars({}), {});
  assert.deepEqual(themeToVars({ bg: "red", accent: "#12", font: "default" }), {});
  assert.match(themeToVars({ font: "times" })["--font-body"], /^"Times New Roman"/);
  assert.deepEqual(themeToVars({ font: "inter" }), {}); // phông cũ không còn thì bỏ qua
});

test("readTheme chịu được dữ liệu hỏng", () => {
  assert.deepEqual(readTheme(null), {});
  assert.deepEqual(readTheme("{hỏng"), {});
});

test("script khởi tạo tự đủ và chạy được", () => {
  const style: Record<string, string> = {};
  const g = globalThis as Record<string, unknown>;
  g.localStorage = { getItem: () => JSON.stringify({ bg: "#202020", accent: "#ff8800", font: "arial" }) };
  g.document = { documentElement: { style: { setProperty: (k: string, v: string) => { style[k] = v; } } } };
  new Function(themeInitScript)();
  assert.equal(style["--background"], "#202020");
  assert.equal(style["--accent"], "#ff8800");
  assert.match(style["--font-body"], /^Arial/);
  delete g.localStorage; delete g.document;
});
