let cachedShow = null;
let pollHandle = null;

async function fetchShow() {
  const response = await fetch(`api/show?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    cachedShow = null;
    return null;
  }
  const payload = await response.json();
  cachedShow = payload.ok ? payload : null;
  return cachedShow;
}

export async function getActiveShow() {
  if (cachedShow) {
    return cachedShow;
  }
  return fetchShow();
}

export function startShowPolling(intervalMs = 5000) {
  if (pollHandle) {
    return;
  }
  pollHandle = window.setInterval(async () => {
    const before = cachedShow?.id || null;
    const current = await fetchShow();
    const after = current?.id || null;
    if (before !== after) {
      document.dispatchEvent(new CustomEvent("show:changed", {
        detail: { before, after, show: current },
      }));
    }
  }, intervalMs);
}
