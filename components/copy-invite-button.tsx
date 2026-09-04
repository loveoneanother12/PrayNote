"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

export function CopyInviteButton({ code, groupId }: { code: string; groupId: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(value: string, type: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="invite-actions">
      <button className="copy-code-button" type="button" onClick={() => copy(code, "code")}>
        {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
        {copied === "code" ? "복사됨" : "코드 복사"}
      </button>
      <button className="copy-code-button secondary" type="button" onClick={() => copy(`${window.location.origin}/join/${groupId}`, "link")}>
        {copied === "link" ? <Check size={16} /> : <Link2 size={16} />}
        {copied === "link" ? "복사됨" : "초대 링크"}
      </button>
    </div>
  );
}
