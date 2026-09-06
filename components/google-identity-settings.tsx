"use client";

import { Check, Link2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleIdentitySettings() {
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUserIdentities().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("계정 연결 상태를 확인하지 못했어요.");
      else setLinked((data?.identities ?? []).some((identity) => identity.provider === "google"));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function linkGoogle() {
    if (linking || linked) return;
    setLinking(true);
    setMessage("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?linked=google")}`;
    const { error } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } });
    if (error) {
      setMessage(error.message.toLowerCase().includes("manual linking")
        ? "Supabase에서 수동 계정 연결 설정을 먼저 켜야 합니다."
        : "Google 계정을 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
      setLinking(false);
    }
  }

  return (
    <div className="google-identity-setting">
      <div className="google-identity-copy">
        <span className="google-mark" aria-hidden="true">G</span>
        <div><strong>Google 계정</strong><small>{linked ? "로그인 수단으로 연결되어 있습니다." : "기존 기도 기록을 그대로 유지하며 Google 로그인을 추가합니다."}</small></div>
      </div>
      <button className={`outline-button google-link-button ${linked ? "linked" : ""}`} type="button" onClick={linkGoogle} disabled={loading || linking || linked}>
        {loading || linking ? <LoaderCircle className="button-spinner" size={15} /> : linked ? <Check size={15} /> : <Link2 size={15} />}
        {loading ? "확인 중…" : linking ? "Google로 이동 중…" : linked ? "연결됨" : "Google 계정 연결"}
      </button>
      {message && <p className="google-identity-message" role="alert">{message}</p>}
    </div>
  );
}
