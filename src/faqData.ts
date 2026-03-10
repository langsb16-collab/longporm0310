import { translations, Language } from './translations';

export const getFAQItems = (lang: Language) => {
  return translations[lang].faq.items;
};
