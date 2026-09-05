"use client";

import { useState } from "react";
import { PrayerOwnerActions } from "@/components/prayer-owner-actions";
import type { PrayerSummary } from "@/lib/domain";

export function PrayerDetailContent({ prayer, groups }: { prayer: PrayerSummary; groups: Array<{ id: string; name: string }> }) {
  const [content, setContent] = useState(prayer.content);
  return (
    <>
      <PrayerOwnerActions
        prayerId={prayer.id}
        initialContent={content}
        initialSharedGroups={prayer.groupIds.map((id, index) => ({ id, name: prayer.groupNames[index] ?? "공유 그룹" }))}
        groups={groups}
        onContentChange={setContent}
        compact
      />
      <p className="prayer-full-content">{content}</p>
    </>
  );
}
