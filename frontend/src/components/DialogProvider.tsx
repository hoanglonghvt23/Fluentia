"use client";

import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Options = { danger?: boolean };
type Ask = { message: string; kind: "confirm" | "alert"; danger: boolean; resolve: (ok: boolean) => void };
type ToastKind = "ok" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };
type Api = {
  /** Thông báo ngắn tự tắt ở góc màn hình (không chặn thao tác). */
  toast: (message: string, kind?: ToastKind) => void;
  /** Hỏi xác nhận; trả về true nếu người dùng đồng ý. */
  confirm: (message: string, opts?: Options) => Promise<boolean>;
  /** Báo một thông tin; xong khi người dùng bấm OK. */
  alert: (message: string) => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function useDialog(): Api {
  const api = useContext(Ctx);
  if (!api) throw new Error("useDialog phải nằm trong DialogProvider");
  return api;
}

// Thay thế confirm()/alert() mặc định của trình duyệt bằng hộp thoại cùng giao diện với hệ thống.
// Dùng thẻ <dialog> gốc nên có sẵn khóa focus, phím Esc và lớp nền mờ.
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dialog");
  const [ask, setAsk] = useState<Ask | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++nextId.current;
    setToasts((all) => [...all.slice(-3), { id, message, kind }]); // tối đa 4 thông báo cùng lúc
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 8000);
  }, []);

  const open = useCallback(
    (a: Omit<Ask, "resolve">) =>
      new Promise<boolean>((resolve) =>
        setAsk((prev) => {
          prev?.resolve(false); // hộp cũ (nếu còn) coi như bị hủy
          return { ...a, resolve };
        }),
      ),
    [],
  );

  const api = useMemo<Api>(
    () => ({
      toast,
      confirm: (message, opts) => open({ message, kind: "confirm", danger: !!opts?.danger }),
      alert: async (message) => { await open({ message, kind: "alert", danger: false }); },
    }),
    [open, toast],
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ask && !d.open) d.showModal();
    if (!ask && d.open) d.close();
  }, [ask]);

  const close = (ok: boolean) => {
    ask?.resolve(ok);
    setAsk(null);
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <dialog
        ref={ref}
        className="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onCancel={(e) => { e.preventDefault(); close(false); }} // phím Esc
        onClick={(e) => { if (e.target === e.currentTarget) close(false); }} // bấm ra ngoài
      >
        {ask && (
          <div className="flex flex-col gap-4">
            <h2 id="dialog-title">{ask.kind === "confirm" ? t("confirmTitle") : t("noticeTitle")}</h2>
            <p id="dialog-message" className="whitespace-pre-line text-sm">{ask.message}</p>
            <div className="flex flex-wrap justify-end gap-2">
              {ask.kind === "confirm" && (
                <button type="button" className="btn" onClick={() => close(false)}>{t("cancel")}</button>
              )}
              <button
                type="button"
                autoFocus
                className={`btn ${ask.danger ? "btn-danger-solid" : "btn-primary"}`}
                onClick={() => close(true)}
              >
                {ask.kind === "confirm" ? t("confirm") : t("ok")}
              </button>
            </div>
          </div>
        )}
      </dialog>
      <div className="fixed bottom-20 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((x) => (
          <div
            key={x.id}
            className={`card flex items-start justify-between gap-3 text-sm shadow-lg ${x.kind === "error" ? "!border-[var(--bad)]" : x.kind === "ok" ? "!border-[var(--ok)]" : ""}`}
          >
            <p className={`min-w-0 break-words ${x.kind === "error" ? "msg-err" : x.kind === "ok" ? "msg-ok" : ""}`}>{x.message}</p>
            <button type="button" className="btn btn-sm shrink-0" onClick={() => setToasts((all) => all.filter((y) => y.id !== x.id))}>
              {t("close")}
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
