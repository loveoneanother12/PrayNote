"use client";

import { BookHeart, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useState } from "react";
import { SharePrayerModal } from "@/components/share-prayer-modal";
import { createClient } from "@/lib/supabase/client";

type GroupOption = { id: string; name: string };

export function GroupPrayerComposer({ currentGroup, groups, onCreated }: { currentGroup: GroupOption; groups: GroupOption[]; onCreated?: (prayerId: string, content: string) => void }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [createdPrayerId, setCreatedPrayerId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prayerContent = content.trim();
    if (pending || !prayerContent) return;
    setPending(true);
    setError("");
    const supabase = createClient();
    const { data: prayerId, error: mutationError } = await supabase.rpc("create_prayer_with_groups", {
      prayer_content: prayerContent,
      target_group_ids: [currentGroup.id],
      is_personal: false,
    });
    if (mutationError || !prayerId) {
      setError("기도제목을 등록하지 못했어요.");
      setPending(false);
      return;
    }
    setContent("");
    setPending(false);
    setCreatedPrayerId(prayerId);
    onCreated?.(prayerId, prayerContent);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <section className="inline-composer">
        <div className="inline-composer-icon"><BookHeart size={22} /></div>
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="group-prayer-content">기도제목</label>
          <textarea id="group-prayer-content" name="content" maxLength={2000} required value={content} onChange={(event) => setContent(event.target.value)} placeholder="함께 기도받고 싶은 내용을 적어주세요." />
          <div><span>{error || "등록 날짜는 한국시간 기준으로 자동 저장돼요."}</span><button className={`primary-button ${pending ? "button-pending" : ""}`} type="submit" disabled={pending || !content.trim()}>{pending ? <><LoaderCircle className="button-spinner" size={15} />등록 중…</> : <><Plus size={17} />기도제목 등록</>}</button></div>
        </form>
      </section>
      {createdPrayerId && <SharePrayerModal prayerId={createdPrayerId} currentGroup={currentGroup} groups={groups} returnTo={`/groups/${currentGroup.id}`} onClose={() => setCreatedPrayerId(null)} />}
    </>
  );
}
