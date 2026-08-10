import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationTH from './locales/th.json';

const resources = {
  en: translationEN,
  th: translationTH
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'th', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
