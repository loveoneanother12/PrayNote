const ORDER_KEY_PREFIX = "praynote:group-order:";
const PREVIEW_KEY_PREFIX = "praynote:dashboard-preview:";

function readStringArray(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
  } catch {
    return null;
  }
}

export function restoreGroupOrder(accountKey: string, availableIds: string[]) {
  const saved = readStringArray(`${ORDER_KEY_PREFIX}${accountKey}`);
  if (!saved) return availableIds;
  const available = new Set(availableIds);
  const restored = saved.filter((id) => available.has(id));
  return [...restored, ...availableIds.filter((id) => !restored.includes(id))];
}

export function saveGroupOrder(accountKey: string, orderedIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${ORDER_KEY_PREFIX}${accountKey}`, JSON.stringify(orderedIds));
}

export function restoreDashboardPreview(accountKey: string, availableIds: string[], fallback: string[]) {
  const saved = readStringArray(`${PREVIEW_KEY_PREFIX}${accountKey}`);
  if (!saved) return fallback;
  const available = new Set(["personal", ...availableIds]);
  return saved.filter((id) => available.has(id));
}

export function saveDashboardPreview(accountKey: string, selectedIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${PREVIEW_KEY_PREFIX}${accountKey}`, JSON.stringify(selectedIds));
}
