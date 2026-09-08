"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MobilePrayerSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("modal-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <button className="icon-button mobile-search-button" type="button" aria-label="기도제목 검색" onClick={() => setOpen(true)}><Search size={20} /></button>
    {open && createPortal(
      <div className="modal-backdrop mobile-search-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
        <section className="mobile-search-modal" role="dialog" aria-modal="true" aria-labelledby="mobile-search-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mobile-search-heading"><strong id="mobile-search-title">기도제목 검색</strong><button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={19} /></button></div>
          <form action="/search" method="get" className="mobile-search-form">
            <Search size={18} />
            <input ref={inputRef} name="q" aria-label="검색어" placeholder="이름이나 기도제목을 검색하세요" />
            <button className="primary-button" type="submit">검색</button>
          </form>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
