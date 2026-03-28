/**
 * Telegram Web App bootstrap (implementation-plan phase 1).
 * HMR in dev may attach duplicate viewport listeners until full reload; harmless for resize.
 */
export function initTelegramWebAppOnce(): void {
  const twa = window.Telegram?.WebApp;
  if (!twa) return;
  twa.ready();
  twa.expand();
}

export function subscribeViewportResize(queueResize: () => void): void {
  const twa = window.Telegram?.WebApp;
  if (twa) {
    twa.onEvent("viewportChanged", () => queueResize());
  }
  window.addEventListener("resize", queueResize);
  window.visualViewport?.addEventListener("resize", queueResize);
  queueResize();
}
