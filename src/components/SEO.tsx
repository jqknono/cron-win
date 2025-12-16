import React from 'react';
import { useTranslation } from 'react-i18next';

type SEOProps = {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
};

const setOrUpdateMeta = (attr: 'name' | 'property', key: string, content: string) => {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attr}="${key}"][data-seo-managed="true"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute('data-seo-managed', 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setOrUpdateLink = (rel: string, href: string) => {
  if (typeof document === 'undefined') return;
  const selector = `link[rel="${rel}"][data-seo-managed="true"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute('data-seo-managed', 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const setOrUpdateJsonLd = (id: string, data: unknown) => {
  if (typeof document === 'undefined') return;
  const selector = `script[type="application/ld+json"][data-seo-managed="${id}"]`;
  let el = document.head.querySelector<HTMLScriptElement>(selector);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo-managed', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};

const cleanupManaged = () => {
  if (typeof document === 'undefined') return;
  document.head
    .querySelectorAll('[data-seo-managed]')
    .forEach((el) => el.parentElement?.removeChild(el));
};

export const SEO: React.FC<SEOProps> = ({ title, description, keywords, canonicalUrl }) => {
  const { t, i18n } = useTranslation();

  const pageTitle = title ?? t('app.title');
  const pageDescription = description ?? t('app.subtitle');
  const defaultKeywords = [
    'Windows Task Scheduler',
    'PowerShell',
    'Windows 10',
    'XML',
    'cron',
    'scheduled task',
    'task scheduler'
  ];
  const metaKeywords = (keywords && keywords.length ? keywords : defaultKeywords).join(', ');

  let canonical = canonicalUrl;
  if (!canonical) {
    const envBase = process.env.REACT_APP_SITE_URL;
    if (envBase) {
      try {
        const url = new URL(envBase.replace(/\/$/, ''));
        canonical = url.toString();
      } catch {
        // ignore invalid env URL
      }
    }
    if (!canonical && typeof window !== 'undefined') {
      canonical = `${window.location.origin}${window.location.pathname}`;
    }
  }

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = pageTitle;
      document.documentElement.lang = i18n.language || 'en';

      setOrUpdateMeta('name', 'description', pageDescription);
      setOrUpdateMeta('name', 'keywords', metaKeywords);
      setOrUpdateMeta('name', 'theme-color', '#0f172a');

      setOrUpdateMeta('property', 'og:type', 'website');
      setOrUpdateMeta('property', 'og:title', pageTitle);
      setOrUpdateMeta('property', 'og:description', pageDescription);
      if (canonical) setOrUpdateMeta('property', 'og:url', canonical);
      setOrUpdateMeta('property', 'og:site_name', t('app.title'));
      const ogLocale = (i18n.language || 'en-US').replace('-', '_');
      setOrUpdateMeta('property', 'og:locale', ogLocale);

      setOrUpdateMeta('name', 'twitter:card', 'summary');
      setOrUpdateMeta('name', 'twitter:title', pageTitle);
      setOrUpdateMeta('name', 'twitter:description', pageDescription);

      if (canonical) setOrUpdateLink('canonical', canonical);

      setOrUpdateJsonLd('structured-data', {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: pageTitle,
        applicationCategory: 'Utility',
        operatingSystem: 'Windows',
        description: pageDescription,
        url: canonical || '',
      });
    }

    return () => {
      cleanupManaged();
    };
  }, [pageTitle, pageDescription, metaKeywords, canonical, i18n.language, t]);

  return null;
};

export default SEO;
