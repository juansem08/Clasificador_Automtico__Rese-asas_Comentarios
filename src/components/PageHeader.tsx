import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TKey } from '../i18n/core';
import { Rich, useI18n } from '../i18n/I18n';
import { useStore } from '../state/store';
import type { View } from '../types';

interface Props {
  eyebrow: string;
  /** Título grande en serif; admite *cursiva* (marcas del diccionario). */
  title?: string;
  /** Título pequeño en sans (como en "¡Hola! Empecemos…"). */
  subtitle?: string;
  actions?: ReactNode;
  right?: ReactNode;
  /** Título más bajo para pantallas con poco espacio vertical (Resultados). */
  compact?: boolean;
}

export default function PageHeader({ eyebrow, title, subtitle, actions, right, compact }: Props) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-4 ${compact ? 'mb-4' : 'mb-5'}`}>
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        {subtitle && <h1 className="mt-1 text-xl font-bold text-ink">{subtitle}</h1>}
        {title && (
          <h1 className={`display mt-1 ${compact ? 'text-[44px]' : 'text-[56px]'}`}>
            <Rich text={title} />
          </h1>
        )}
        {actions && <div className={`flex flex-wrap items-center gap-2.5 ${compact ? 'mt-3' : 'mt-5'}`}>{actions}</div>}
      </div>
      {right}
    </header>
  );
}

type StepState = 'done' | 'active' | 'todo';

/** Pasos del flujo: Cargar → Clasificar → Revisar y exportar. */
export function Stepper() {
  const { analysis, stats, exported, setView } = useStore();
  const { t } = useI18n();
  const toClassify = stats.pending + stats.errors;
  const classifiedAll = stats.classified > 0 && toClassify === 0;
  const steps: { label: TKey; view: View; state: StepState }[] = [
    { label: 'steps.load', view: 'load', state: analysis ? 'done' : 'active' },
    { label: 'steps.classify', view: 'results', state: !analysis ? 'todo' : classifiedAll ? 'done' : 'active' },
    { label: 'steps.review', view: 'dashboard', state: exported ? 'done' : classifiedAll ? 'active' : 'todo' },
  ];
  // Solo un paso "activo" a la vez: el primero no terminado
  const current = steps.findIndex((s) => s.state !== 'done');

  return (
    <ol className="flex items-center gap-1 rounded-full bg-surface p-1.5 shadow-soft dark:border dark:border-line">
      {steps.map((s, i) => {
        const isCurrent = i === current;
        const done = s.state === 'done';
        return (
          <li key={s.label}>
            <button
              className={`flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold transition ${
                isCurrent ? 'bg-night text-on-night dark:bg-ink dark:text-canvas' : 'text-ink-2 hover:bg-sunken'
              }`}
              onClick={() => setView(s.view)}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent ? 'bg-tape text-on-tape' : done ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-2'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              {t(s.label)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
