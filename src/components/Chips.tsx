import type { Priority, Sentiment } from '../../shared/types';
import { useI18n } from '../i18n/I18n';
import { LOW_CONFIDENCE } from '../lib/data';
import { PRIORITY_STYLE, SENTIMENT_STYLE } from '../lib/labels';

export function SentimentChip({ value }: { value: Sentiment }) {
  const { sentiment } = useI18n();
  return <span className={`chip ${SENTIMENT_STYLE[value].chip}`}>{sentiment(value)}</span>;
}

export function PriorityChip({ value }: { value: Priority }) {
  const { priority } = useI18n();
  return <span className={`chip ${PRIORITY_STYLE[value]}`}>{priority(value)}</span>;
}

/** Número de confianza para la tabla; si es baja se marca para revisión. */
export function ConfidenceValue({ value, edited, reviewed }: { value?: number; edited?: boolean; reviewed?: boolean }) {
  const { t } = useI18n();
  if (edited) return <span className="text-xs font-medium text-ink-3">{t('chips.corrected')}</span>;
  if (typeof value !== 'number') return <span className="text-ink-3">—</span>;
  const low = value < LOW_CONFIDENCE && !reviewed;
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold tabular-nums ${low ? 'text-warn-ink' : 'text-ink'}`}
      title={low ? t('chips.lowConf') : t('chips.conf')}
    >
      {low && <span className="h-1.5 w-1.5 rounded-full bg-warn-ink" />}
      {value}
    </span>
  );
}

/** Anillo de confianza (0–100). */
export function ConfidenceRing({ value, size = 44 }: { value: number; size?: number }) {
  const { t } = useI18n();
  const stroke = 5;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const low = value < LOW_CONFIDENCE;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t('chips.confAria', { n: value })}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--muted))" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={low ? 'rgb(var(--warn-line))' : 'rgb(var(--accent))'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * len} ${len}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
