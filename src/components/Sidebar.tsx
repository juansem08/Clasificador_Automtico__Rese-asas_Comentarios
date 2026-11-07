import { ArrowRight, FileText, History, LayoutGrid, Monitor, Moon, PanelsTopLeft, Settings, Sparkles, Sun, Upload, type LucideIcon } from 'lucide-react';
import type { TKey } from '../i18n/core';
import { LANGUAGES } from '../i18n/core';
import { useI18n } from '../i18n/I18n';
import { useStore } from '../state/store';
import type { Theme, View } from '../types';

const NAV: { view: View; label: TKey; icon: LucideIcon }[] = [
  { view: 'load', label: 'nav.load', icon: Upload },
  { view: 'results', label: 'nav.results', icon: PanelsTopLeft },
  { view: 'dashboard', label: 'nav.dashboard', icon: LayoutGrid },
  { view: 'report', label: 'nav.report', icon: FileText },
  { view: 'history', label: 'nav.history', icon: History },
  { view: 'settings', label: 'nav.settings', icon: Settings },
];

const THEMES: { value: Theme; icon: LucideIcon }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

export default function Sidebar() {
  const { view, setView, settings, theme, setTheme, setShowKeyModal } = useStore();
  const { t, lang, setLang } = useI18n();

  return (
    <nav className="card flex w-[232px] shrink-0 flex-col p-4">
      <div className="flex items-center gap-3 px-2 pb-7 pt-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent">
          <Sparkles size={19} />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-bold text-ink">{t('app.brandTop')}</div>
          <div className="truncate text-xs text-ink-2">{t('app.brandBottom')}</div>
        </div>
      </div>

      <ul className="flex-1 space-y-1">
        {NAV.map(({ view: v, label, icon: Icon }) => {
          const active = view === v;
          return (
            <li key={v}>
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition ${
                  active ? 'bg-accent font-bold text-on-accent' : 'font-medium text-ink hover:bg-sunken'
                }`}
                onClick={() => setView(v)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                <span className="flex-1 truncate text-left">{t(label)}</span>
                {active && <ArrowRight size={16} className="shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3">
        <div className="rounded-3xl bg-sunken p-4 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <span className={`h-2 w-2 shrink-0 rounded-full ${settings.hasKey ? 'bg-accent' : 'bg-ink-3'}`} />
            {settings.hasKey ? t('sidebar.geminiOn') : t('sidebar.geminiOff')}
          </div>
          <div className="mt-1.5 truncate text-ink-2">{settings.model || t('sidebar.noModel')}</div>
          <button className="mt-2.5 text-left font-semibold text-accent-ink hover:underline" onClick={() => setShowKeyModal(true)}>
            {settings.hasKey ? t('sidebar.changeKey') : t('sidebar.setKey')}
          </button>
        </div>

        {/* Idioma */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sunken p-1" role="radiogroup" aria-label={t('sidebar.language')}>
          {LANGUAGES.map((l) => {
            const on = lang === l.value;
            return (
              <button
                key={l.value}
                role="radio"
                aria-checked={on}
                title={l.label}
                className={`rounded-xl py-1.5 text-xs font-bold transition ${
                  on ? 'bg-surface text-ink shadow-soft dark:bg-accent dark:text-on-accent' : 'text-ink-2 hover:text-ink'
                }`}
                onClick={() => setLang(l.value)}
              >
                {l.short}
              </button>
            );
          })}
        </div>

        {/* Tema */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sunken p-1" role="radiogroup" aria-label={t('sidebar.theme')}>
          {THEMES.map(({ value, icon: Icon }) => {
            const on = theme === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={on}
                title={t(`theme.${value}`)}
                className={`flex items-center justify-center rounded-xl py-2 transition ${
                  on ? 'bg-surface text-ink shadow-soft dark:bg-accent dark:text-on-accent' : 'text-ink-2 hover:text-ink'
                }`}
                onClick={() => setTheme(value)}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
