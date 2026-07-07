import type { Dictionary, Locale } from "./types";
import { dictionary as ko } from "./dictionaries/ko";
import { dictionary as en } from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { ko, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ko;
}

/** `{count}` 같은 플레이스홀더 치환 */
export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export type { Dictionary, Locale };
export { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE } from "./types";
