import type { Sentiment } from '../../../shared/types';
import { useI18n } from '../../i18n/I18n';
import { SENTIMENT_STYLE } from '../../lib/labels';
import { pct, type CategoryStat } from '../../lib/stats';
import { STACK_ORDER } from './order';
import { TipRow, TooltipLayer, useTooltip } from './Tooltip';

interface Props {
  categories: CategoryStat[];
  asTable: boolean;
  onSelect: (categoria: string, sentimiento?: Sentiment) => void;
}

/** Barras horizontales apiladas: cuántas opiniones tiene cada categoría y con qué sentimiento. */
export default function CategoryBars({ categories, asTable, onSelect }: Props) {
  const { t, sentimentPlural, category } = useI18n();
  const { tip, show, hide } = useTooltip();
  const max = Math.max(...categories.map((c) => c.total), 1);

  if (asTable) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr className="eyebrow">
              <th className="py-2 pr-3 font-semibold">{t('fields.category')}</th>
              {STACK_ORDER.map((s) => (
                <th key={s} className="px-3 py-2 text-right font-semibold">
                  {sentimentPlural(s)}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold">{t('charts.total')}</th>
              <th className="py-2 pl-3 text-right font-semibold">{t('charts.negShort')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line tabular-nums">
            {categories.map((c) => (
              <tr key={c.name}>
                <td className="py-2 pr-3 font-medium">{category(c.name)}</td>
                {STACK_ORDER.map((s) => (
                  <td key={s} className="px-3 py-2 text-right">
                    <button className="rounded-full px-2 hover:bg-sunken hover:underline" onClick={() => onSelect(c.name, s)}>
                      {c.counts[s]}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-bold">{c.total}</td>
                <td className="py-2 pl-3 text-right text-ink-2">{pct(c.counts.Negativo, c.total)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <button
            className="w-28 shrink-0 truncate text-left text-sm font-medium text-ink hover:underline"
            onClick={() => onSelect(c.name)}
            title={category(c.name)}
          >
            {category(c.name)}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {c.total > 0 && (
              <div className="flex h-5 gap-[2px]" style={{ width: `${(c.total / max) * 88}%` }}>
                {STACK_ORDER.filter((s) => c.counts[s] > 0).map((s, i, arr) => (
                  <button
                    key={s}
                    className={`h-full transition hover:brightness-110 ${i === arr.length - 1 ? 'rounded-r' : ''}`}
                    style={{ flexGrow: c.counts[s], flexBasis: 0, background: SENTIMENT_STYLE[s].color }}
                    onMouseMove={(e) =>
                      show(
                        e,
                        <>
                          <div className="mb-1 font-semibold text-ink">{category(c.name)}</div>
                          {STACK_ORDER.map((x) => (
                            <TipRow key={x} color={SENTIMENT_STYLE[x].color} label={sentimentPlural(x)} value={c.counts[x]} />
                          ))}
                        </>,
                      )
                    }
                    onMouseLeave={hide}
                    onClick={() => onSelect(c.name, s)}
                    aria-label={`${category(c.name)}, ${sentimentPlural(s)}: ${c.counts[s]}`}
                  />
                ))}
              </div>
            )}
            <span className="text-sm font-semibold tabular-nums text-ink-2">{c.total}</span>
          </div>
        </div>
      ))}
      <TooltipLayer tip={tip} />
    </div>
  );
}
