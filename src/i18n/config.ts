import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import koKR from './locales/ko-KR.json';
import thTH from './locales/th-TH.json';
import idID from './locales/id-ID.json';
import arSA from './locales/ar-SA.json';
import deDE from './locales/de-DE.json';
import nlNL from './locales/nl-NL.json';
import esES from './locales/es-ES.json';
import ptPT from './locales/pt-PT.json';
import frFR from './locales/fr-FR.json';
import ruRU from './locales/ru-RU.json';

const resources = {
  'zh-CN': {
    translation: zhCN
  },
  'zh-TW': {
    translation: zhTW
  },
  'en-US': {
    translation: enUS
  },
  'ja-JP': {
    translation: jaJP
  },
  'ko-KR': {
    translation: koKR
  },
  'th-TH': {
    translation: thTH
  },
  'id-ID': {
    translation: idID
  },
  'ar-SA': {
    translation: arSA
  },
  'de-DE': {
    translation: deDE
  },
  'nl-NL': {
    translation: nlNL
  },
  'es-ES': {
    translation: esES
  },
  'pt-PT': {
    translation: ptPT
  },
  'fr-FR': {
    translation: frFR
  },
  'ru-RU': {
    translation: ruRU
  }
};

export const LANGUAGE_STORAGE_KEY = 'cron-win-language';
const FALLBACK_LANGUAGE = 'en-US';
const SUPPORTED_LANGUAGES = Object.keys(resources);

const resolveInitialLanguage = (): string => {
  if (typeof window === 'undefined') {
    return FALLBACK_LANGUAGE;
  }

  try {
    const persistedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (persistedLanguage && SUPPORTED_LANGUAGES.includes(persistedLanguage)) {
      return persistedLanguage;
    }
  } catch {
    // Ignore storage access issues (private mode, disabled storage, etc.)
  }

  if (typeof window !== 'undefined') {
    const browserPreferences = window.navigator.languages && window.navigator.languages.length > 0
      ? window.navigator.languages
      : window.navigator.language
        ? [window.navigator.language]
        : [];

    const normalizedCandidates = browserPreferences
      .map((language) => language.toLowerCase())
      .filter(Boolean);

    for (const candidate of normalizedCandidates) {
      const exactMatch = SUPPORTED_LANGUAGES.find(
        (language) => language.toLowerCase() === candidate
      );

      if (exactMatch) {
        return exactMatch;
      }
    }

    for (const candidate of normalizedCandidates) {
      const baseCandidate = candidate.split('-')[0];
      const partialMatch = SUPPORTED_LANGUAGES.find(
        (language) => language.split('-')[0].toLowerCase() === baseCandidate
      );

      if (partialMatch) {
        return partialMatch;
      }
    }
  }

  return FALLBACK_LANGUAGE;
};

const initialLanguage = resolveInitialLanguage();

try {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, initialLanguage);
  }
} catch {
  // Storage might be unavailable; ignore the error and continue.
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
