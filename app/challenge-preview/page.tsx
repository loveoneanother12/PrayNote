import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { notFound } from "next/navigation";
import { GroupChallengePreview } from "@/components/group-challenge-preview";

export default function ChallengePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <main className="challenge-preview-page">
    <header>
      <Link href="/dashboard"><ArrowLeft size={16} />돌아가기</Link>
      <span><FlaskConical size={15} />로컬 UX 미리보기</span>
    </header>
    <section className="challenge-preview-context">
      <p>GROUP DETAIL</p>
      <h1>카리스</h1>
      <span>실제 데이터는 저장되지 않습니다. 아래 테스트 버튼으로 여러 상태를 확인해보세요.</span>
    </section>
    <GroupChallengePreview groupId="local-preview" groupName="카리스" role="leader" memberCount={12} displayName="이현재" />
  </main>;
}
