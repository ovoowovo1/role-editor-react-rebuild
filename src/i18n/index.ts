import { zhTW } from './zh-TW';
import { en } from './en';

export type Locale = 'zh-TW' | 'en';
export type TranslationParams = Record<string, string | number>;

const translations: Record<Locale, Record<string, string>> = { 'zh-TW': zhTW, en };

let _locale: Locale = 'zh-TW';

export function setLocale(locale: Locale) {
  _locale = locale;
}

export function getLocale(): Locale {
  return _locale;
}

export function t(key: string, params?: TranslationParams): string {
  const template = translations[_locale]?.[key] ?? translations.en?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
