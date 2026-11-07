import { Calendar, Check, ChevronDown, ChevronUp, Copy, Files, Flag, LoaderCircle, MousePointerClick, RotateCcw, Sparkle, Tag, WandSparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PRIORITIES, SENTIMENTS, type Priority, type Row, type Sentiment } from '../../shared/types';
import { Rich, useI18n, type I18n } from '../i18n/I18n';
import { LOW_CONFIDENCE } from '../lib/data';
import { formatDate } from '../lib/dates';
import { useStore } from '../state/store';
import { ConfidenceRing, SentimentChip } from './Chips';

interface Props {
  row?: Row;
  position: string;
  onPrev?: () => void;
  onNext?: () => void;
}

function InfoItem({ icon: Icon, label, children }: { icon: typeof Tag; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="icon-tile">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-ink-2">{label}</div>
        <div className="truncate font-bold text-ink">{children}</div>
      </div>
    </div>
  );
}

/** Error guardado en la fila → texto en el idioma actual (incluye errores antiguos guardados como texto). */
function rowErrorText(i18n: I18n, error = ''): string {
  const byCode = i18n.tMaybe(`errors.${error}`);
  if (byCode) return byCode;
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(error)) return i18n.t('errors.overloaded');
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(error)) return i18n.t('errors.quota');
  return error;
}

/** Tamaño de la cita según su longitud, para que las largas no ocupen todo el panel. */
const quoteSize = (len: number) => (len > 220 ? 'text-[20px]' : len > 120 ? 'text-[24px]' : 'text-[30px]');

/** Panel lateral fijo con la opinión seleccionada: motivo, datos, corrección y respuesta. */
export default function ReviewPanel({ row, position, onPrev, onNext }: Props) {
  const { editRow, allCategories, generateReplies, replyingIds, running, markReviewed, classify } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditing(false);
    setCopied(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [row?.id]);

  // Navegación con el teclado (↑ ↓), salvo cuando se escribe
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'INPUT') return;
      if (e.key === 'ArrowUp' && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowDown' && onNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext]);

  if (!row) {
    return (
      <aside className="card flex h-full flex-col items-center justify-center p-8 text-center">
        <span className="icon-tile mb-4 h-14 w-14 rounded-2xl">
          <MousePointerClick size={22} />
        </span>
        <p className="font-display text-3xl leading-tight text-ink">
          <Rich text={t('panel.emptyTitle')} />
        </p>
        <p className="mt-2 text-sm text-ink-2">{t('panel.emptyText')}</p>
      </aside>
    );
  }

  const classified = Boolean(row.sentimiento && row.categoria);
  const isDup = row.status === 'duplicate';
  const replying = replyingIds.has(row.id);
  const low = typeof row.confianza === 'number' && row.confianza < LOW_CONFIDENCE;

  const copy = async () => {
    if (!row.respuesta) return;
    await navigator.clipboard.writeText(row.respuesta);
    setCopied(true);
  };

  const review = () => {
    markReviewed(row.id);
    onNext?.();
  };

  const editors: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }[] = [
    {
      label: t('fields.sentiment'),
      value: row.sentimiento ?? '',
      options: SENTIMENTS.map((s) => ({ value: s, label: i18n.sentiment(s) })),
      onChange: (v) => editRow(row.id, { sentimiento: v as Sentiment }),
    },
    {
      label: t('fields.category'),
      value: row.categoria ?? '',
      options: allCategories.map((c) => ({ value: c, label: i18n.category(c) })),
      onChange: (v) => editRow(row.id, { categoria: v }),
    },
    {
      label: t('fields.priority'),
      value: row.prioridad ?? 'Baja',
      options: PRIORITIES.map((p) => ({ value: p, label: i18n.priority(p) })),
      onChange: (v) => editRow(row.id, { prioridad: v as Priority }),
    },
  ];

  return (
    <aside className="card flex h-full min-h-0 flex-col p-6 2xl:p-7">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">{t('panel.selected')}</span>
        {row.sentimiento && <SentimentChip value={row.sentimiento} />}
      </div>

      <div ref={scrollRef} className="-mr-3 mt-4 min-h-0 flex-1 overflow-y-auto pr-3">
        <blockquote className={`font-display leading-[1.1] tracking-tight text-ink ${quoteSize(row.text.length)}`}>
          “{row.text || t('panel.emptyOpinion')}”
        </blockquote>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <span>
            #{row.id + 1} · {position}
          </span>
          {row.date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {formatDate(row.date)}
            </span>
          )}
          {isDup && (
            <span className="flex items-center gap-1">
              <Files size={12} /> {t('panel.duplicateOf', { n: (row.duplicateOf ?? 0) + 1 })}
            </span>
          )}
          {row.edited && <span>{t('panel.edited')}</span>}
          {row.reviewed && !row.edited && <span className="font-semibold text-accent-ink">{t('panel.reviewed')}</span>}
        </div>

        {row.status === 'error' && (
          <div className="mt-5 rounded-3xl bg-neg-soft p-4">
            <p className="text-sm font-medium leading-relaxed text-neg-ink">{rowErrorText(i18n, row.error)}</p>
            <button className="btn-primary mt-3 px-4 py-2" disabled={running} onClick={() => void classify(false, [row.id])}>
              <RotateCcw size={14} /> {t('panel.retryOne')}
            </button>
          </div>
        )}
        {(row.status === 'pending' || row.status === 'skipped' || (isDup && !classified)) && (
          <p className="mt-5 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-2">
            {row.status === 'skipped' ? t('panel.skipped') : t('panel.notYet')}
          </p>
        )}

        {classified && (
          <>
            {row.motivo && (
              <div className="mt-5 rounded-3xl bg-accent-soft p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent-ink">
                  <Sparkle size={13} fill="currentColor" /> {t('panel.reason')}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{row.motivo}</p>
              </div>
            )}

            {editing ? (
              <div className="mt-5 space-y-3">
                {editors.map(({ label, value, options, onChange }) => (
                  <label key={label} className="block">
                    <span className="eyebrow mb-1 block">{label}</span>
                    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={running}>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-5 space-y-3.5">
                <InfoItem icon={Tag} label={t('fields.category')}>
                  {i18n.category(row.categoria!)}
                  {row.tema && <span className="ml-1.5 text-xs font-medium text-ink-2">· {row.tema}</span>}
                </InfoItem>
                <InfoItem icon={Flag} label={t('fields.priority')}>
                  {row.prioridad ? i18n.priority(row.prioridad) : '—'}
                </InfoItem>
                {typeof row.confianza === 'number' && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center">
                      <ConfidenceRing value={row.confianza} />
                    </span>
                    <div>
                      <div className="text-xs text-ink-2">{t('fields.confidence')}</div>
                      <div className="font-bold text-ink">
                        {row.confianza}%{' '}
                        {low && !row.reviewed && !row.edited && (
                          <span className="text-xs font-semibold text-warn-ink">{t('panel.lowHint')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-line pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">{t('panel.reply')}</span>
                {row.respuesta && (
                  <button className="flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline" onClick={copy}>
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('common.copied') : t('common.copy')}
                  </button>
                )}
              </div>
              {row.respuesta !== undefined && (
                <textarea
                  className="input mb-2 h-32 resize-none leading-relaxed"
                  value={row.respuesta}
                  onChange={(e) => editRow(row.id, { respuesta: e.target.value })}
                />
              )}
              <button
                className="flex items-center gap-1.5 text-sm font-semibold text-accent-ink hover:underline disabled:opacity-50"
                disabled={replying || running}
                onClick={() => void generateReplies([row.id])}
              >
                {replying ? <LoaderCircle size={15} className="animate-spin" /> : <WandSparkles size={15} />}
                {replying ? t('panel.writing') : row.respuesta ? t('panel.regenerate') : t('panel.generate')}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        {classified && !isDup && (
          <>
            <button className="btn-primary w-full py-3.5 text-[15px]" onClick={review} disabled={running}>
              {row.reviewed ? t('panel.reviewedBtn') : t('panel.markReviewed')} <Check size={17} />
            </button>
            <button className="btn-outline w-full py-3.5 text-[15px]" onClick={() => setEditing((e) => !e)} disabled={running}>
              {editing ? t('panel.done') : t('panel.fix')}
            </button>
          </>
        )}
        <div className="flex justify-center gap-2 pt-1">
          <button className="btn-icon h-8 w-8" onClick={onPrev} disabled={!onPrev} aria-label={t('panel.prev')}>
            <ChevronUp size={16} />
          </button>
          <button className="btn-icon h-8 w-8" onClick={onNext} disabled={!onNext} aria-label={t('panel.next')}>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
