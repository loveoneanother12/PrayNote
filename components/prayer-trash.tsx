"use client";

import { Check, ChevronDown, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { formatKoreaDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

type TrashPrayer = { id: string; content: string; status: "active" | "completed"; createdAt: string; deletedAt: string; groupNames: string[] };

export function PrayerTrash({ initialPrayers }: { initialPrayers: TrashPrayer[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prayers, setPrayers] = useState(initialPrayers);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<"restore" | "delete" | null>(null);
  const [message, setMessage] = useState("");

  function toggle(id: string) {
    if (pending) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function run(action: "restore" | "delete") {
    if (!selected.length || pending) return;
    if (action === "delete" && !window.confirm(`선택한 기도제목 ${selected.length}개를 완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    setPending(action);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc(action === "restore" ? "restore_prayers_from_trash" : "permanently_delete_prayers", { target_prayer_ids: selected });
    if (error) {
      setMessage(action === "restore" ? "복원하지 못했어요." : "완전히 삭제하지 못했어요.");
      setPending(null);
      return;
    }
    setPrayers((current) => current.filter((prayer) => !selected.includes(prayer.id)));
    setSelected([]);
    setPending(null);
    setMessage(action === "restore" ? "선택한 기도제목을 복원했어요." : "선택한 기도제목을 완전히 삭제했어요.");
    startTransition(() => router.refresh());
  }

  return <section className="prayer-trash">
    <button className="prayer-trash-trigger" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span><Trash2 size={17} /><strong>휴지통</strong><em>{prayers.length}</em></span>
      <span>삭제한 기도제목 보관함 <ChevronDown className={open ? "open" : ""} size={17} /></span>
    </button>
    {open && <div className="prayer-trash-body">
      {prayers.length > 0 && <div className="prayer-trash-toolbar"><span>{selected.length > 0 ? `${selected.length}개 선택됨` : "항목을 눌러 선택하세요"}</span><div>
        <button type="button" onClick={() => run("restore")} disabled={!selected.length || pending !== null}>{pending === "restore" ? <LoaderCircle className="button-spinner" size={14} /> : <RotateCcw size={14} />}복원</button>
        <button className="permanent-delete" type="button" onClick={() => run("delete")} disabled={!selected.length || pending !== null}>{pending === "delete" ? <LoaderCircle className="button-spinner" size={14} /> : <Trash2 size={14} />}완전 삭제</button>
      </div></div>}
      {message && <p className="prayer-trash-message" role="status">{message}</p>}
      <div className="prayer-trash-list">
        {prayers.map((prayer) => { const isSelected = selected.includes(prayer.id); return <button className={`prayer-trash-item ${isSelected ? "selected" : ""}`} type="button" aria-pressed={isSelected} onClick={() => toggle(prayer.id)} key={prayer.id}>
          <span className="trash-checkbox">{isSelected && <Check size={12} />}</span><span className="trash-prayer-copy"><strong>{prayer.content}</strong><small>{formatKoreaDate(prayer.createdAt)} 등록 · {prayer.groupNames.length ? prayer.groupNames.join(", ") : "개인기도"}</small></span>
        </button>; })}
        {prayers.length === 0 && <div className="prayer-trash-empty"><Trash2 size={21} /><span>휴지통이 비어 있어요.</span></div>}
      </div>
    </div>}
  </section>;
}
