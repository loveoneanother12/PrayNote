"use client";

import { ShieldOff, UserRoundX } from "lucide-react";
import { useState } from "react";
import { ProfileDot } from "@/components/profile-dot";
import { createClient } from "@/lib/supabase/client";
import type { ProfileColor } from "@/lib/domain";

export type BlockedUser = { userId: string; displayName: string; profileColor: ProfileColor; blockedAt: string };

export function BlockedUsersSettings({ initialUsers }: { initialUsers: BlockedUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [pending, setPending] = useState<string | null>(null);
  async function unblock(userId: string) {
    setPending(userId);
    const { error } = await createClient().rpc("unblock_user", { target_user_id: userId });
    if (!error) setUsers((current) => current.filter((user) => user.userId !== userId));
    setPending(null);
  }
  return <section className="settings-panel blocked-users-panel">
    <div className="settings-panel-heading"><span><ShieldOff size={18} /></span><div><h2>차단한 사용자</h2><p>차단한 사용자의 기도제목과 알림은 표시되지 않습니다.</p></div></div>
    {users.length ? <div className="blocked-user-list">{users.map((user) => <div key={user.userId}><ProfileDot color={user.profileColor} label={user.displayName} /><strong>{user.displayName}</strong><button type="button" onClick={() => unblock(user.userId)} disabled={pending === user.userId}>{pending === user.userId ? "해제 중…" : "차단 해제"}</button></div>)}</div> : <div className="blocked-users-empty"><UserRoundX size={18} />차단한 사용자가 없습니다.</div>}
  </section>;
}
