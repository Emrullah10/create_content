import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './locales/tr.js';
import en from './locales/en.js';

// Varsayilan dil Turkce; secim tarayicida saklanir. Icerik (makaleler) Ingilizcedir, yalniz panel ceviriliyor.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { tr: { translation: tr }, en: { translation: en } },
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage'], lookupLocalStorage: 'cc_lang', caches: ['localStorage'] },
    lng: undefined,
  });

if (!i18n.language || !['tr', 'en'].includes(i18n.language)) i18n.changeLanguage('tr');

export default i18n;
