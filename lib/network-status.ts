export const NETWORK_ERROR_EVENT = "praynote:network-error";

export function isLikelyNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /failed to fetch|network|load failed|internet|offline|connection/i.test(message);
}

export function reportNetworkError(error?: unknown) {
  if (typeof window === "undefined") return;
  if (error === undefined || isLikelyNetworkError(error)) {
    window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT));
  }
}
