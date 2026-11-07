import { useState, type MouseEvent, type ReactNode } from 'react';

export interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

export function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
  return {
    tip,
    show: (e: MouseEvent, content: ReactNode) => setTip({ x: e.clientX, y: e.clientY, content }),
    hide: () => setTip(null),
  };
}

export function TooltipLayer({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  const left = Math.min(tip.x + 14, window.innerWidth - 230);
  const top = Math.min(tip.y + 14, window.innerHeight - 150);
  return (
    <div
      className="pointer-events-none fixed z-50 min-w-40 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink-2 shadow-soft"
      style={{ left, top }}
    >
      {tip.content}
    </div>
  );
}

/** Fila estándar de tooltip: muestra de color + nombre + valor. */
export function TipRow({ color, label, value }: { color?: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5">
        {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}
