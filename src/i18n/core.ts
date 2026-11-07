/**
 * Motor de traducción sin React: lo usan la interfaz, las exportaciones y el proceso principal.
 */
import { LANGS, type Lang } from '../../shared/types';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';

/** Misma forma que el diccionario español, con todos los valores como string. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof es>;

type Paths<T> = { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];
/** Todas las claves válidas, p. ej. "results.title". */
export type TKey = Paths<typeof es>;
export type Params = Record<string, string | number>;

const DICTS: Record<Lang, Dict> = { es, en, ru };

export const LANGUAGES: { value: Lang; label: string; short: string }[] = [
  { value: 'es', label: 'Español', short: 'ES' },
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'ru', label: 'Русский', short: 'RU' },
];

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** Idioma del sistema si es uno de los soportados; si no, español. */
export function detectLang(locale: string | undefined): Lang {
  const base = (locale ?? '').slice(0, 2).toLowerCase();
  return isLang(base) ? base : 'es';
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

const pluralRules = new Map<Lang, Intl.PluralRules>();
function pluralForm(lang: Lang, n: number, forms: string[]): string {
  if (!pluralRules.has(lang)) pluralRules.set(lang, new Intl.PluralRules(lang));
  const cat = pluralRules.get(lang)!.select(n);
  if (lang === 'ru') return cat === 'one' ? forms[0] : cat === 'few' ? (forms[1] ?? forms[0]) : (forms[2] ?? forms[1] ?? forms[0]);
  return cat === 'one' ? forms[0] : (forms[1] ?? forms[0]);
}

function format(lang: Lang, text: string, params?: Params): string {
  return text
    .replace(/\{(\w+)\|([^}]*)\}/g, (_, name: string, forms: string) => pluralForm(lang, Number(params?.[name] ?? 0), forms.split('|')))
    .replace(/\{(\w+)\}/g, (m, name: string) => (params && name in params ? String(params[name]) : m));
}

/** Traduce una clave; si falta en el idioma, usa el español. */
export function translate(lang: Lang, key: TKey, params?: Params): string {
  return format(lang, lookup(DICTS[lang], key) ?? lookup(es as Dict, key) ?? key, params);
}

/** Igual que translate, pero para claves dinámicas: devuelve undefined si no existen. */
export function translateMaybe(lang: Lang, key: string, params?: Params): string | undefined {
  const text = lookup(DICTS[lang], key) ?? lookup(es as Dict, key);
  return text === undefined ? undefined : format(lang, text, params);
}

/** Nombre visible de una categoría: traduce las predeterminadas y deja tal cual las personalizadas. */
export function categoryLabel(lang: Lang, name: string): string {
  return translateMaybe(lang, `categories.${name}`) ?? name;
}

/** Todas las traducciones de una clave (p. ej. para reconocer columnas exportadas en otro idioma). */
export function allTranslations(key: TKey): string[] {
  return LANGS.map((l) => translate(l, key));
}

// ---------- Idioma actual (para utilidades fuera de React, como el formato de fechas) ----------

let current: Lang = 'es';
export const getLang = () => current;
export const setCurrentLang = (lang: Lang) => {
  current = lang;
};
