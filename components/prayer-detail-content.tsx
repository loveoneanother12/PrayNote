"use client";

import { useState } from "react";
import { PrayerOwnerActions } from "@/components/prayer-owner-actions";
import { PrayerSafetyMenu } from "@/components/prayer-safety-menu";
import type { PrayerSummary } from "@/lib/domain";

export function PrayerDetailContent({ prayer, groups, currentUserId }: { prayer: PrayerSummary; groups: Array<{ id: string; name: string }>; currentUserId?: string }) {
  const [content, setContent] = useState(prayer.content);
  return (
    <>
      {prayer.authorId === currentUserId ? <PrayerOwnerActions
        prayerId={prayer.id}
        initialContent={content}
        initialSharedGroups={prayer.groupIds.map((id, index) => ({ id, name: prayer.groupNames[index] ?? "공유 그룹" }))}
        groups={groups}
        onContentChange={setContent}
        compact
      /> : prayer.authorId ? <PrayerSafetyMenu prayerId={prayer.id} authorId={prayer.authorId} authorName={prayer.authorName} /> : null}
      <p className="prayer-full-content">{content}</p>
    </>
  );
}
