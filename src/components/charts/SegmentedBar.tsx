import type { Sentiment } from '../../../shared/types';
import { useI18n } from '../../i18n/I18n';
import { SENTIMENT_STYLE } from '../../lib/labels';
import { pct, type SentimentCounts } from '../../lib/stats';
import { STACK_ORDER } from './order';
import { TipRow, TooltipLayer, useTooltip } from './Tooltip';

interface Props {
  counts: SentimentCounts;
  onSelect: (s: Sentiment) => void;
}

/** Barra segmentada: el total dividido en sus partes; la leyenda debajo lleva las cifras. */
export default function SegmentedBar({ counts, onSelect }: Props) {
  const { sentimentPlural } = useI18n();
  const { tip, show, hide } = useTooltip();
  const total = STACK_ORDER.reduce((a, s) => a + counts[s], 0);

  return (
    <div>
      <div
        className="flex h-11 gap-[3px]"
        role="img"
        aria-label={STACK_ORDER.map((s) => `${sentimentPlural(s)}: ${counts[s]} (${pct(counts[s], total)}%)`).join(', ')}
      >
        {STACK_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <button
            key={s}
            className="rounded-xl transition hover:brightness-110"
            style={{ flexGrow: counts[s], flexBasis: 0, background: SENTIMENT_STYLE[s].color }}
            onMouseMove={(e) =>
              show(e, <TipRow color={SENTIMENT_STYLE[s].color} label={sentimentPlural(s)} value={`${counts[s]} · ${pct(counts[s], total)}%`} />)
            }
            onMouseLeave={hide}
            onClick={() => onSelect(s)}
            aria-label={`${sentimentPlural(s)}: ${counts[s]}, ${pct(counts[s], total)}%`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {STACK_ORDER.map((s) => (
          <button key={s} className="text-left" onClick={() => onSelect(s)}>
            <span className="flex items-center gap-1.5 text-xs text-ink-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SENTIMENT_STYLE[s].color }} />
              {sentimentPlural(s)}
            </span>
            <span className="mt-1 block text-xl font-bold text-ink">
              {counts[s]} <span className="text-sm font-medium text-ink-3">· {pct(counts[s], total)}%</span>
            </span>
          </button>
        ))}
      </div>
      <TooltipLayer tip={tip} />
    </div>
  );
}
