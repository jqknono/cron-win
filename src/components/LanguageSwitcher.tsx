import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import { LANGUAGE_STORAGE_KEY } from '../i18n/config';

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};

const languages: LanguageOption[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt-PT', name: 'Portuguese', nativeName: 'Português' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' }
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const switcherRef = React.useRef<HTMLDivElement>(null);

  const currentLanguage = React.useMemo(() => {
    const active = i18n.language;

    return (
      languages.find((language) => language.code === active) ||
      languages.find(
        (language) => active?.startsWith(language.code.split('-')[0])
      ) ||
      languages[0]
    );
  }, [i18n.language]);

  const closeMenu = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      }
    } catch {
      // Ignore storage issues (e.g., private browsing restrictions)
    }

    closeMenu();
  };

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="language-switcher" ref={switcherRef}>
      <button
        type="button"
        className={`language-menu-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={currentLanguage?.name}
      >
        <Globe size={16} />
        <span className="language-menu-toggle__label">
          {currentLanguage?.nativeName ?? currentLanguage?.name}
        </span>
      </button>

      <div
        className={`language-menu ${isOpen ? 'open' : ''}`}
        role="listbox"
        aria-label="Language selector"
      >
        {languages.map((language) => (
          <button
            key={language.code}
            type="button"
            role="option"
            aria-selected={i18n.language === language.code}
            className={`language-menu-item ${
              i18n.language === language.code ? 'active' : ''
            }`}
            onClick={() => handleLanguageChange(language.code)}
            title={language.name}
          >
            <span className="language-menu-item__native">{language.nativeName}</span>
            <span className="language-menu-item__name">{language.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
