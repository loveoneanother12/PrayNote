import Link from "next/link";
import { KeyRound, LogOut, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ProfileDot } from "@/components/profile-dot";
import { getAdminUsers, isSuperAdmin } from "@/lib/admin-queries";
import { createClient } from "@/lib/supabase/server";
import { deleteUserByAdmin, forceUserSignOut, setUserSuspension } from "./actions";

type PageProps = { searchParams: Promise<{ q?: string; page?: string; saved?: string; error?: string }> };

function formatDate(value: string | null) {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const savedMessages: Record<string, string> = { suspended: "계정을 정지했습니다.", unsuspended: "계정 정지를 해제했습니다.", "signed-out": "모든 로그인 세션을 종료했습니다.", deleted: "회원 계정을 영구 삭제했습니다." };

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const search = (query.q ?? "").trim().slice(0, 100);
  const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
  const supabase = await createClient();
  if (!(await isSuperAdmin(supabase))) redirect("/dashboard");
  const { users, total, pageSize } = await getAdminUsers(supabase, search, page);
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  return <AdminShell active="users"><header className="admin-page-header"><div><p>MEMBER OPERATIONS</p><h1>회원 관리</h1><span>가입 계정과 활동 현황을 확인하고 접근 권한을 관리합니다.</span></div><div className="admin-total"><strong>{total}</strong><span>검색된 회원</span></div></header>{(query.saved || query.error) && <div className={`page-notice ${query.error ? "error" : ""}`}>{query.saved ? savedMessages[query.saved] : query.error === "confirmation" ? "삭제하려는 회원의 이메일을 정확히 입력해주세요." : "관리자 작업을 처리하지 못했습니다."}</div>}<form className="admin-user-search" action="/admin/users"><Search size={18} /><input name="q" defaultValue={search} placeholder="이름 또는 이메일 검색" aria-label="회원 검색" /><button type="submit">검색</button>{search && <Link href="/admin/users">초기화</Link>}</form><section className="admin-user-list" aria-label="회원 목록">{users.map((user) => { const protectedAccount = user.isSuperAdmin; return <article className={`admin-user-card ${user.isSuspended ? "suspended" : ""}`} key={user.userId}><div className="admin-user-identity"><ProfileDot color={user.profileColor} label={user.displayName} /><div><div><strong>{user.displayName}</strong>{user.isSuperAdmin && <span className="admin-badge"><ShieldCheck size={12} />SUPER ADMIN</span>}{user.isSuspended && <span className="suspended-badge">정지됨</span>}</div><p>{user.email}</p><small>{user.providers.length ? user.providers.join(" · ") : "email"} 로그인</small></div></div><dl className="admin-user-stats"><div><dt>가입 그룹</dt><dd>{user.groupCount}</dd></div><div><dt>기도제목</dt><dd>{user.prayerCount}</dd></div><div><dt>기도완료</dt><dd>{user.prayerResponseCount}</dd></div></dl><div className="admin-user-dates"><span><small>가입일</small>{formatDate(user.createdAt)}</span><span><small>최근 활동</small>{formatDate(user.lastActivityAt)}</span></div>{protectedAccount ? <div className="admin-protected"><KeyRound size={15} />슈퍼어드민 계정은 이 화면에서 변경할 수 없습니다.</div> : <div className="admin-user-actions"><form action={setUserSuspension}><input type="hidden" name="userId" value={user.userId} /><input type="hidden" name="shouldSuspend" value={user.isSuspended ? "no" : "yes"} /><ConfirmSubmitButton className={user.isSuspended ? "admin-action restore" : "admin-action suspend"} message={`${user.email} 계정을 ${user.isSuspended ? "다시 활성화" : "정지"}할까요?`}>{user.isSuspended ? <><ShieldCheck size={14} />정지 해제</> : <><ShieldOff size={14} />계정 정지</>}</ConfirmSubmitButton></form><form action={forceUserSignOut}><input type="hidden" name="userId" value={user.userId} /><ConfirmSubmitButton className="admin-action" message={`${user.email} 계정의 모든 로그인 세션을 종료할까요?`}><LogOut size={14} />강제 로그아웃</ConfirmSubmitButton></form><details className="admin-delete-details"><summary><Trash2 size={14} />영구 삭제</summary><form action={deleteUserByAdmin}><input type="hidden" name="userId" value={user.userId} /><p>되돌릴 수 없습니다. 확인을 위해 아래에 회원 이메일을 입력하세요.</p><input name="confirmationEmail" type="email" placeholder={user.email} required /><label><input name="deleteAllPrayers" type="checkbox" value="yes" />그룹에 공유한 기도제목도 함께 삭제</label><ConfirmSubmitButton className="admin-delete-confirm" message={`${user.email} 계정을 정말 영구 삭제할까요?`}>회원 영구 삭제</ConfirmSubmitButton></form></details></div>}</article>; })}{!users.length && <div className="admin-empty">검색 조건에 맞는 회원이 없습니다.</div>}</section>{pageCount > 1 && <nav className="admin-pagination" aria-label="회원 목록 페이지"><Link className={page <= 1 ? "disabled" : ""} href={`/admin/users?q=${encodeURIComponent(search)}&page=${Math.max(page - 1, 1)}`}>이전</Link><span>{page} / {pageCount}</span><Link className={page >= pageCount ? "disabled" : ""} href={`/admin/users?q=${encodeURIComponent(search)}&page=${Math.min(page + 1, pageCount)}`}>다음</Link></nav>}</AdminShell>;
}
