"use client";

import { RefreshCw, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isLikelyNetworkError, NETWORK_ERROR_EVENT } from "@/lib/network-status";

export function NetworkStatusDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    const hide = () => setOpen(false);
    const rejected = (event: PromiseRejectionEvent) => {
      if (isLikelyNetworkError(event.reason)) show();
    };
    window.addEventListener("offline", show);
    window.addEventListener("online", hide);
    window.addEventListener(NETWORK_ERROR_EVENT, show);
    window.addEventListener("unhandledrejection", rejected);
    if (!navigator.onLine) show();
    return () => {
      window.removeEventListener("offline", show);
      window.removeEventListener("online", hide);
      window.removeEventListener(NETWORK_ERROR_EVENT, show);
      window.removeEventListener("unhandledrejection", rejected);
    };
  }, []);

  if (!open) return null;
  return createPortal(<div className="network-error-backdrop" role="presentation"><section className="network-error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="network-error-title"><button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={18} /></button><span><WifiOff size={25} /></span><h2 id="network-error-title">네트워크 연결이 원활하지 않습니다.</h2><p>인터넷 연결을 확인한 뒤 다시 시도해주세요.</p><button className="primary-button" type="button" onClick={() => window.location.reload()}><RefreshCw size={15} />다시 연결</button></section></div>, document.body);
}
