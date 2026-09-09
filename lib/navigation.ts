export function safeInternalPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function onboardingDashboardPath(nextValue: unknown) {
  const next = safeInternalPath(nextValue);
  const params = new URLSearchParams({ guide: "1" });
  if (next !== "/dashboard") params.set("afterGuide", next);
  return `/dashboard?${params.toString()}`;
}
