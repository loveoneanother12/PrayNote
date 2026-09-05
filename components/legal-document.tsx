import Link from "next/link";
import { ArrowLeft, BookHeart, FileText, ShieldCheck } from "lucide-react";

type LegalDocumentProps = {
  kind: "privacy" | "terms";
  eyebrow: string;
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
};

export function LegalDocument({ kind, eyebrow, title, effectiveDate, children }: LegalDocumentProps) {
  return (
    <main className="legal-page">
      <header className="legal-topbar">
        <Link className="brand legal-brand" href="/">
          <span className="brand-mark"><BookHeart size={21} /></span>
          <span>PrayNote</span>
        </Link>
        <Link className="legal-back-link" href="/login">
          <ArrowLeft size={16} /> 로그인으로 돌아가기
        </Link>
      </header>

      <article className="legal-card">
        <nav className="legal-document-tabs" aria-label="약관 및 개인정보처리방침">
          <Link className={kind === "terms" ? "active" : ""} href="/terms"><FileText size={15} />이용약관</Link>
          <Link className={kind === "privacy" ? "active" : ""} href="/privacy"><ShieldCheck size={15} />개인정보처리방침</Link>
        </nav>

        <div className="legal-heading">
          <span className="legal-icon">{kind === "privacy" ? <ShieldCheck size={25} /> : <FileText size={25} />}</span>
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
