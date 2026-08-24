import { DEFAULT_GA_MEASUREMENT_ID, GA_MEASUREMENT_ID, initGoogleAnalytics, measurementIdForHost, shouldEnableAnalytics, trackEvent } from './analytics';

describe('analytics', () => {
  const originalGtag = window.gtag;
  const originalDataLayer = window.dataLayer;

  afterEach(() => {
    window.gtag = originalGtag;
    window.dataLayer = originalDataLayer;
    document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach((el) => el.remove());
  });

  test('uses the dedicated cronwin GA4 measurement id', () => {
    expect(GA_MEASUREMENT_ID).toBe(DEFAULT_GA_MEASUREMENT_ID);
    expect(measurementIdForHost('cronwin.techfetch.dev')).toBe('G-X9SWY9XJQQ');
    expect(measurementIdForHost('wincron.techfetch.dev')).toBe('G-CEFCKBHQ59');
    expect(measurementIdForHost('taskscheduler.techfetch.dev')).toBe('G-SL4XBKRQ0Y');
  });

  test('skips localhost unless debug is enabled', () => {
    expect(shouldEnableAnalytics('localhost')).toBe(false);
    expect(shouldEnableAnalytics('127.0.0.1')).toBe(false);
    expect(shouldEnableAnalytics('cronwin.techfetch.dev')).toBe(true);
  });

  test('initGoogleAnalytics injects gtag and records page config', () => {
    const previousDebug = process.env.REACT_APP_GA_DEBUG;
    process.env.REACT_APP_GA_DEBUG = 'true';
    delete window.gtag;
    window.dataLayer = [];

    initGoogleAnalytics();

    expect(typeof window.gtag).toBe('function');
    expect(document.head.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)).not.toBeNull();
    expect(window.dataLayer.some((item) => Array.isArray(item) && item[0] === 'config' && item[1] === GA_MEASUREMENT_ID)).toBe(true);
    process.env.REACT_APP_GA_DEBUG = previousDebug;
  });

  test('trackEvent sends named events through gtag', () => {
    const previousDebug = process.env.REACT_APP_GA_DEBUG;
    process.env.REACT_APP_GA_DEBUG = 'true';
    const gtag = jest.fn();
    window.gtag = gtag;

    trackEvent('download_xml', { task_name: 'Backup' });

    expect(gtag).toHaveBeenCalledWith('event', 'download_xml', { task_name: 'Backup' });
    process.env.REACT_APP_GA_DEBUG = previousDebug;
  });
});
