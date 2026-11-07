import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Impact, Lang, Priority, Sentiment } from '../../shared/types';
import { categoryLabel, detectLang, isLang, setCurrentLang, translate, translateMaybe, type Params, type TKey } from './core';

const KEY = 'idioma';

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    // sin almacenamiento disponible
  }
  return detectLang(navigator.language);
}

function useI18nValue() {
  const [lang, setLangState] = useState<Lang>(() => {
    const l = loadLang();
    setCurrentLang(l);
    return l;
  });

  useEffect(() => {
    setCurrentLang(lang);
    document.documentElement.lang = lang;
    document.title = translate(lang, 'app.name');
  }, [lang]);

  /** `persist`: guardar también en la configuración de la app (compartida entre versiones). */
  const setLang = useCallback((l: Lang, persist = true) => {
    setCurrentLang(l);
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // ignorar
    }
    if (persist) void window.api.setLanguage(l);
  }, []);

  const t = useCallback((key: TKey, params?: Params) => translate(lang, key, params), [lang]);
  const tMaybe = useCallback((key: string, params?: Params) => translateMaybe(lang, key, params), [lang]);

  return useMemo(
    () => ({
      lang,
      setLang,
      t,
      tMaybe,
      sentiment: (s: Sentiment) => t(`sentiment.${s}`),
      sentimentPlural: (s: Sentiment) => t(`sentimentPlural.${s}`),
      priority: (p: Priority) => t(`priority.${p}`),
      impact: (i: Impact) => t(`impact.${i}`),
      category: (name: string) => categoryLabel(lang, name),
      /** Texto de error a partir de un código traducible (o el texto tal cual si no lo hay). */
      error: (res: { error?: string; code?: string; params?: Record<string, string> }) =>
        (res.code && translateMaybe(lang, `errors.${res.code}`, res.params)) || res.error || '',
    }),
    [lang, setLang, t, tMaybe],
  );
}

export type I18n = ReturnType<typeof useI18nValue>;
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const value = useI18nValue();
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fuera de I18nProvider');
  return ctx;
}

/**
 * Pinta un texto traducido con marcas de estilo: *cursiva* y _subrayado decorativo_
 * (cada idioma coloca la palabra destacada donde le corresponde).
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') ? (
          <em key={i} className="italic">
            {p.slice(1, -1)}
          </em>
        ) : p.startsWith('_') ? (
          <span key={i} className="relative inline-block">
            {p.slice(1, -1)}
            <span className="absolute bottom-[0.02em] left-0 h-[5px] w-full -rotate-1 rounded-full bg-accent" />
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** Quita las marcas de estilo (para textos planos como el PDF o atributos). */
export const plain = (text: string) => text.replace(/[*_]/g, '');
