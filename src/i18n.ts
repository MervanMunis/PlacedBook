// src/i18n.ts
import 'intl-pluralrules';
import i18n, { LanguageDetectorModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import tr from './locales/tr.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ku from './locales/ku.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

const languageDetector: LanguageDetectorModule = {
  type: 'languageDetector',
  detect: () => {
    // Get the phone's locale (e.g., 'en-US', 'es-ES')
    const locale = Localization.locale.split('-')[0]; // 'en' from 'en-US'
    
    // Check if the locale is in the list of supported languages, otherwise fallback to 'en'
    const supportedLanguages = ['en', 'tr', 'es', 'ar', 'de', 'fr', 'hi', 'it', 'ja', 'ku', 'ru', 'zh'];
    return supportedLanguages.includes(locale) ? locale : 'en';
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',       
    debug: false,        
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      es: { translation: es },
      ar: { translation: ar },
      de: { translation: de },
      fr: { translation: fr },
      hi: { translation: hi },
      it: { translation: it },
      ja: { translation: ja },
      ku: { translation: ku },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })
  .then(() => console.log("i18n initialized successfully"))
  .catch((error) => console.error("i18n initialization error:", error));

export default i18n;
