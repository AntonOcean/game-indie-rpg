export {};

/** Minimal typings for https://telegram.org/js/telegram-web-app.js (expand as needed). */
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  viewportStableHeight: number;
  viewportHeight: number;
  onEvent(eventType: string, eventHandler: () => void): void;
  offEvent(eventType: string, eventHandler: () => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
