export const DEFAULT_GA_MEASUREMENT_ID = 'G-X9SWY9XJQQ';

export const GA_MEASUREMENT_IDS_BY_HOST: Record<string, string> = {
  'cronwin.techfetch.dev': 'G-X9SWY9XJQQ',
  'wincron.techfetch.dev': 'G-CEFCKBHQ59',
  'taskscheduler.techfetch.dev': 'G-SL4XBKRQ0Y'
};

export const GA_MEASUREMENT_ID =
  process.env.REACT_APP_GA_MEASUREMENT_ID || DEFAULT_GA_MEASUREMENT_ID;

export function measurementIdForHost(hostname = typeof window === 'undefined' ? '' : window.location.hostname): string {
  return GA_MEASUREMENT_IDS_BY_HOST[hostname] || GA_MEASUREMENT_ID;
}

type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: GtagFunction;
  }
}

export function shouldEnableAnalytics(hostname = typeof window === 'undefined' ? '' : window.location.hostname): boolean {
  if (!measurementIdForHost(hostname)) {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.REACT_APP_GA_DEBUG === 'true';
  }

  return true;
}

export function initGoogleAnalytics(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (!shouldEnableAnalytics() || typeof window.gtag === 'function') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  const measurementId = measurementIdForHost();
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (!shouldEnableAnalytics() || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, params);
}
