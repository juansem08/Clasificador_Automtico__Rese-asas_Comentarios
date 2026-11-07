import { KeyRound, Languages, Monitor, Moon, Plus, RefreshCw, RotateCcw, Save, Sun, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY, type CategoryDef } from '../../shared/types';
import PageHeader from '../components/PageHeader';
import { LANGUAGES } from '../i18n/core';
import { useI18n } from '../i18n/I18n';
import { useStore } from '../state/store';
import type { Theme } from '../types';

const MAX_CATEGORIES = 12;

const THEMES: { value: Theme; icon: LucideIcon }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="card grid gap-6 p-8 lg:grid-cols-[250px_1fr]">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{text}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function SettingsView() {
  const { settings, models, refreshModels, setModel, saveCategories, theme, setTheme, setShowKeyModal, running } = useStore();
  const i18n = useI18n();
  const { t, lang, setLang } = i18n;
  const [cats, setCats] = useState<CategoryDef[]>(settings.categories);
  const [loadingModels, setLoadingModels] = useState(false);
  const other = i18n.category(FALLBACK_CATEGORY);

  useEffect(() => setCats(settings.categories), [settings.categories]);

  const names = cats.map((c) => c.name.trim().toLowerCase());
  const errors = cats.map((c, i) => {
    const n = c.name.trim();
    if (!n) return t('settings.errName');
    if (n.toLowerCase() === FALLBACK_CATEGORY.toLowerCase() || n.toLowerCase() === other.toLowerCase())
      return t('settings.errOther', { other });
    if (names.indexOf(n.toLowerCase()) !== i) return t('settings.errDup');
    if (!c.description.trim()) return t('settings.errDesc');
    return '';
  });
  const valid = cats.length > 0 && errors.every((e) => !e);
  const dirty = JSON.stringify(cats) !== JSON.stringify(settings.categories);
  const update = (i: number, patch: Partial<CategoryDef>) => setCats((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const reloadModels = async () => {
    setLoadingModels(true);
    await refreshModels();
    setLoadingModels(false);
  };

  const modelOptions = settings.model && !models.includes(settings.model) ? [settings.model, ...models] : models;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} />
      <div className="space-y-5">
        <Section title={t('settings.api')} text={t('settings.apiText')}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-sunken px-4 py-2.5 text-sm">
              <span className={`h-2 w-2 rounded-full ${settings.hasKey ? 'bg-accent' : 'bg-ink-3'}`} />
              {settings.hasKey ? (
                <>
                  {t('settings.connected')} · <span className="font-mono text-ink-2">{settings.maskedKey}</span>
                </>
              ) : (
                t('settings.notSet')
              )}
            </div>
            <button className="btn-outline" onClick={() => setShowKeyModal(true)}>
              <KeyRound size={15} /> {settings.hasKey ? t('settings.changeKey') : t('settings.setKey')}
            </button>
          </div>
        </Section>

        <Section title={t('settings.model')} text={t('settings.modelText')}>
          <div className="flex flex-wrap gap-2">
            <select
              className="input max-w-sm"
              value={settings.model}
              disabled={running || modelOptions.length === 0}
              onChange={(e) => void setModel(e.target.value)}
            >
              {modelOptions.length === 0 && <option value="">{t('settings.noModels')}</option>}
              {modelOptions.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button className="btn-outline" onClick={reloadModels} disabled={!settings.hasKey || loadingModels}>
              <RefreshCw size={15} className={loadingModels ? 'animate-spin' : ''} /> {t('common.refresh')}
            </button>
          </div>
        </Section>

        <Section title={t('settings.language')} text={t('settings.languageText')}>
          <div className="seg" role="radiogroup" aria-label={t('settings.language')}>
            {LANGUAGES.map((l) => (
              <button key={l.value} role="radio" aria-checked={lang === l.value} className="seg-item" onClick={() => setLang(l.value)}>
                <Languages size={15} /> {l.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('settings.appearance')} text={t('settings.appearanceText')}>
          <div className="seg" role="radiogroup" aria-label={t('sidebar.theme')}>
            {THEMES.map(({ value, icon: Icon }) => (
              <button key={value} role="radio" aria-checked={theme === value} className="seg-item" onClick={() => setTheme(value)}>
                <Icon size={15} /> {t(`theme.${value}`)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('settings.categories')} text={t('settings.categoriesText', { other })}>
          <div className="space-y-2.5">
            {cats.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-44 shrink-0">
                  <input
                    className="input"
                    value={c.name}
                    placeholder={t('settings.namePh')}
                    maxLength={30}
                    onChange={(e) => update(i, { name: e.target.value })}
                    aria-label={t('settings.nameAria', { n: i + 1 })}
                  />
                  {errors[i] && <p className="mt-1 px-2 text-xs font-medium text-danger">{errors[i]}</p>}
                </div>
                <textarea
                  rows={2}
                  className="input min-h-[64px] flex-1 resize-y leading-snug"
                  value={c.description}
                  placeholder={t('settings.descPh')}
                  onChange={(e) => update(i, { description: e.target.value })}
                  aria-label={t('settings.descAria', { n: i + 1 })}
                />
                <button
                  className="btn-icon mt-2"
                  onClick={() => setCats((cs) => cs.filter((_, j) => j !== i))}
                  disabled={cats.length <= 1}
                  aria-label={t('settings.deleteAria', { name: c.name || t('settings.categoryWord') })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-2">
              <span className="w-40 shrink-0 font-bold text-ink">{other}</span>
              {t('settings.otherText')}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="btn-outline"
              onClick={() => setCats((cs) => [...cs, { name: '', description: '' }])}
              disabled={cats.length >= MAX_CATEGORIES}
            >
              <Plus size={15} /> {t('settings.add')}
            </button>
            <button className="btn-ghost" onClick={() => setCats(DEFAULT_CATEGORIES)}>
              <RotateCcw size={15} /> {t('settings.restore')}
            </button>
            <div className="flex-1" />
            <button
              className="btn-primary"
              disabled={!valid || !dirty}
              onClick={() => void saveCategories(cats.map((c) => ({ name: c.name.trim(), description: c.description.trim() })))}
            >
              <Save size={15} /> {t('settings.save')}
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-3">{t('settings.note')}</p>
        </Section>
      </div>
    </div>
  );
}
