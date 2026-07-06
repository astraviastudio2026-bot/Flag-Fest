/**
 * QR simulado (maqueta). Genera un patrón determinista a partir de
 * una semilla para que coincida en servidor y cliente (sin randoms).
 * En la fase 2 se reemplaza por un QR real generado desde el token.
 */

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function cellFilled(seed: number, x: number, y: number): boolean {
  // PRNG determinista por celda.
  let v = seed ^ Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v >>> 7) & 1) === 1;
}

const FINDER = [
  [0, 0],
  [0, 6],
  [6, 0],
];

function isFinderZone(x: number, y: number, n: number): boolean {
  return FINDER.some(([fx, fy]) => {
    const ox = fx === 6 ? n - 7 : fx;
    const oy = fy === 6 ? n - 7 : fy;
    return x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
  });
}

export function QrMock({
  value,
  size = 120,
  className = "",
  dark = "#0a0a0a",
}: {
  value: string;
  size?: number;
  className?: string;
  dark?: string;
}) {
  const n = 25;
  const seed = hashString(value);
  const cells: { x: number; y: number }[] = [];

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (isFinderZone(x, y, n)) continue;
      if (cellFilled(seed, x, y)) cells.push({ x, y });
    }
  }

  const finderCorners = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      className={className}
      role="img"
      aria-label="Código QR de ejemplo"
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#ffffff" />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={dark} />
      ))}
      {finderCorners.map(([fx, fy], i) => (
        <g key={`f${i}`} fill={dark}>
          <rect x={fx} y={fy} width={7} height={7} />
          <rect x={fx + 1} y={fy + 1} width={5} height={5} fill="#ffffff" />
          <rect x={fx + 2} y={fy + 2} width={3} height={3} />
        </g>
      ))}
    </svg>
  );
}
