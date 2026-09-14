import Link from "next/link";
import { ArrowLeft, CircleHelp, FileText, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

type LegalDocumentProps = {
  kind: "privacy" | "terms" | "support";
  eyebrow: string;
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
};

export function LegalDocument({ kind, eyebrow, title, effectiveDate, children }: LegalDocumentProps) {
  const headingIcon = kind === "privacy" ? <ShieldCheck size={25} /> : kind === "support" ? <CircleHelp size={25} /> : <FileText size={25} />;
  return (
    <main className="legal-page">
      <header className="legal-topbar">
        <Link className="brand legal-brand" href="/">
          <BrandMark />
          <span>PrayNote</span>
        </Link>
        <Link className="legal-back-link" href="/login">
          <ArrowLeft size={16} /> 로그인으로 돌아가기
        </Link>
      </header>

      <article className="legal-card">
        <nav className="legal-document-tabs" aria-label="서비스 문서">
          <Link className={kind === "terms" ? "active" : ""} href="/terms"><FileText size={15} />이용약관</Link>
          <Link className={kind === "privacy" ? "active" : ""} href="/privacy"><ShieldCheck size={15} />개인정보처리방침</Link>
          <Link className={kind === "support" ? "active" : ""} href="/support"><CircleHelp size={15} />고객지원</Link>
        </nav>

        <div className="legal-heading">
          <span className="legal-icon">{headingIcon}</span>
          <div>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </div>
        <p className="legal-effective-date">시행일: {effectiveDate}</p>
        {children}
      </article>
    </main>
  );
}
