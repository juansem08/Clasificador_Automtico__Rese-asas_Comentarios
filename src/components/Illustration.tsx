/** Ilustración del inicio: cajas isométricas (las opiniones) y un globo con estrellas (las reseñas). */

type Pt = [number, number];
const pts = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

/** Cubo isométrico: (cx, cy) es el centro de la cara superior, w la mitad del ancho, h la altura. */
function Cube({ cx, cy, w, h, top, left, right }: { cx: number; cy: number; w: number; h: number; top: string; left: string; right: string }) {
  const d = w / 2;
  return (
    <g>
      <polygon points={pts([[cx - w, cy], [cx, cy + d], [cx, cy + d + h], [cx - w, cy + h]])} fill={left} />
      <polygon points={pts([[cx, cy + d], [cx + w, cy], [cx + w, cy + h], [cx, cy + d + h]])} fill={right} />
      <polygon points={pts([[cx, cy - d], [cx + w, cy], [cx, cy + d], [cx - w, cy]])} fill={top} />
    </g>
  );
}

function Star({ x, y, filled }: { x: number; y: number; filled: boolean }) {
  const p: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 7 : 3;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    p.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return (
    <polygon
      points={pts(p)}
      fill={filled ? '#e0a96d' : 'none'}
      stroke="#e0a96d"
      strokeWidth={filled ? 0 : 1.2}
      strokeLinejoin="round"
    />
  );
}

export default function Illustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 230" className={className} aria-hidden="true">
      {/* caja grande */}
      <Cube cx={120} cy={128} w={74} h={52} top="#a8560a" left="#d07a1e" right="#a8560a" />
      <polygon points={pts([[120, 98], [178, 128], [120, 158], [62, 128]])} fill="#c46a0c" />
      {/* cubo claro encima */}
      <Cube cx={116} cy={96} w={34} h={30} top="#e9e0d9" left="#d8cdc4" right="#c5b7ad" />
      {/* caja pequeña */}
      <Cube cx={214} cy={170} w={38} h={26} top="#f3dfc8" left="#e0a96d" right="#c4690c" />
      {/* globo con estrellas */}
      <rect x={140} y={8} width={132} height={52} rx={14} fill="#1f1b18" />
      <polygon points={pts([[164, 58], [182, 58], [158, 76]])} fill="#1f1b18" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} x={166 + i * 21} y={34} filled={i < 4} />
      ))}
    </svg>
  );
}
