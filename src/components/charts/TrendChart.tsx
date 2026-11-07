import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18n';
import { SENTIMENT_STYLE } from '../../lib/labels';
import { pct, type TrendPoint } from '../../lib/stats';
import { STACK_ORDER } from './order';
import { TipRow, TooltipLayer, useTooltip } from './Tooltip';

const HEIGHT = 230;
const M = { top: 10, right: 8, bottom: 26, left: 34 };

function niceStep(max: number): number {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]) {
    if (max / s <= 5) return s;
  }
  return Math.ceil(max / 5);
}

/** Path de un rectángulo con las esquinas superiores redondeadas (extremo del dato). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Columnas apiladas por periodo (cantidad de opiniones por sentimiento). */
export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const { tip, show, hide } = useTooltip();
  const { t, sentimentPlural } = useI18n();

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(width - M.left - M.right, 50);
  const innerH = HEIGHT - M.top - M.bottom;
  const maxTotal = Math.max(...points.map((p) => p.total), 1);
  const step = niceStep(maxTotal);
  const yMax = Math.ceil(maxTotal / step) * step;
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH;
  const band = innerW / points.length;
  const colW = Math.max(2, Math.min(24, band * 0.65));
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerW / 72))));
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={HEIGHT} role="img" aria-label={t('charts.trendAria')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'rgb(var(--line-strong))' : 'rgb(var(--line))'} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
              {t}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const cx = M.left + band * i + band / 2;
          const x = cx - colW / 2;
          let acc = 0;
          const segs = STACK_ORDER.filter((s) => p.counts[s] > 0);
          return (
            <g key={p.key}>
              {hover === i && <rect x={M.left + band * i} y={M.top} width={band} height={innerH} className="fill-sunken" rx={8} />}
              {segs.map((s, si) => {
                const y0 = y(acc);
                acc += p.counts[s];
                const y1 = y(acc);
                const isTop = si === segs.length - 1;
                // 2px de separación del color de la superficie entre segmentos
                const h = Math.max(0, y0 - y1 - (isTop ? 0 : 2));
                const top = isTop ? y1 : y1 + 2;
                return isTop ? (
                  <path key={s} d={topRounded(x, top, colW, h, 4)} fill={SENTIMENT_STYLE[s].color} />
                ) : (
                  <rect key={s} x={x} y={top} width={colW} height={h} fill={SENTIMENT_STYLE[s].color} />
                );
              })}
              {i % labelEvery === 0 && (
                <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-3 text-[11px]">
                  {p.label}
                </text>
              )}
              {/* Zona de hover más grande que la columna */}
              <rect
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={innerH}
                fill="transparent"
                onMouseMove={(e) => {
                  setHover(i);
                  show(
                    e,
                    <>
                      <div className="mb-1 font-semibold text-ink">{p.label}</div>
                      {[...STACK_ORDER].reverse().map((s) => (
                        <TipRow key={s} color={SENTIMENT_STYLE[s].color} label={sentimentPlural(s)} value={p.counts[s]} />
                      ))}
                      <div className="mt-1 border-t border-line pt-1">
                        <TipRow label={t('charts.total')} value={p.total} />
                        <TipRow label={t('charts.negPct')} value={`${pct(p.counts.Negativo, p.total)}%`} />
                      </div>
                    </>,
                  );
                }}
                onMouseLeave={() => {
                  setHover(null);
                  hide();
                }}
              />
            </g>
          );
        })}
      </svg>
      <TooltipLayer tip={tip} />
    </div>
  );
}
