"use client";

import { Apple as AppleIcon, Check, Link2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple";

const PROVIDERS: Array<{ provider: OAuthProvider; name: string }> = [
  { provider: "google", name: "Google" },
  { provider: "apple", name: "Apple" },
];

export function OAuthIdentitySettings({ returnTo = "/settings" }: { returnTo?: string }) {
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<OAuthProvider | null>(null);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const appleEnabled = process.env.NEXT_PUBLIC_APPLE_SIGN_IN_ENABLED === "true";

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUserIdentities().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("계정 연결 상태를 확인하지 못했어요.");
      else setLinked(new Set((data?.identities ?? []).map((identity) => identity.provider)));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function linkProvider(provider: OAuthProvider) {
    if (linking || linked.has(provider)) return;
    setLinking(provider);
    setMessage("");
    const supabase = createClient();
    const separator = returnTo.includes("?") ? "&" : "?";
    const next = `${returnTo}${separator}linked=${provider}`;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&provider=${provider}`;
    const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo } });
    if (error) {
      const providerName = provider === "apple" ? "Apple" : "Google";
      setMessage(error.message.toLowerCase().includes("manual linking")
        ? "Supabase에서 수동 계정 연결 설정을 먼저 켜야 합니다."
        : `${providerName} 계정을 연결하지 못했어요. 이미 다른 PrayNote 계정에서 사용 중인지 확인해주세요.`);
      setLinking(null);
    }
  }

  return (
    <div className="identity-settings">
      {PROVIDERS.filter(({ provider }) => provider !== "apple" || appleEnabled).map(({ provider, name }) => {
        const isLinked = linked.has(provider);
        const isLinking = linking === provider;
        return (
          <div className="identity-setting-row" key={provider}>
            <div className="identity-setting-copy">
              <span className={`identity-provider-mark ${provider}`} aria-hidden="true">{provider === "apple" ? <AppleIcon size={17} /> : "G"}</span>
              <div><strong>{name} 계정</strong><small>{isLinked ? "로그인 수단으로 연결되어 있습니다." : `기존 기도 기록을 그대로 유지하며 ${name} 로그인을 추가합니다.`}</small></div>
            </div>
            <button className={`outline-button google-link-button ${isLinked ? "linked" : ""}`} type="button" onClick={() => linkProvider(provider)} disabled={loading || Boolean(linking) || isLinked}>
              {loading || isLinking ? <LoaderCircle className="button-spinner" size={15} /> : isLinked ? <Check size={15} /> : <Link2 size={15} />}
              {loading ? "확인 중…" : isLinking ? `${name}로 이동 중…` : isLinked ? "연결됨" : `${name} 계정 연결`}
            </button>
          </div>
        );
      })}
      {message && <p className="identity-setting-message" role="alert">{message}</p>}
    </div>
  );
}
