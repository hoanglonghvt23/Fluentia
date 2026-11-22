"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions";

// Biểu tượng người dùng ở góc phải: bấm để xem thông tin cơ bản và đăng xuất.
export function UserMenu({ username, role, labels }: {
  username: string;
  role: string;
  labels: { account: string; signedInAs: string; logout: string };
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.account}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <p className="muted text-xs">{labels.signedInAs}</p>
          <p className="font-medium">{username}</p>
          <p className="mb-3"><span className="chip">{role}</span></p>
          <form action={signOut}>
            <button className="btn btn-sm w-full" role="menuitem">{labels.logout}</button>
          </form>
        </div>
      )}
    </div>
  );
}
