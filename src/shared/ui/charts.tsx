import { useEffect, useId, useState, type ReactNode } from 'react';

export type ChartSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export function AnimatedNumber({
  value,
  duration = 700,
  format = (n) => String(Math.round(n)),
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;
    const delta = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{format(display)}</>;
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function DonutChart({
  slices,
  size = 180,
  thickness = 22,
  center,
}: {
  slices: ChartSlice[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const safeTotal = total || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div
        className="relative mx-auto flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={thickness}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {center ?? (
            <p className="text-sm text-[var(--muted-foreground)]">No data</p>
          )}
        </div>
      </div>
    );
  }

  const { segments } = slices.reduce(
    (acc, slice, index) => {
      const length = (slice.value / safeTotal) * circumference;
      acc.segments.push({
        slice,
        length,
        dashOffset: -acc.offset,
        index,
      });
      return { segments: acc.segments, offset: acc.offset + length };
    },
    {
      segments: [] as {
        slice: ChartSlice;
        length: number;
        dashOffset: number;
        index: number;
      }[],
      offset: 0,
    },
  );

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label="Status distribution"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {segments.map(({ slice, length, dashOffset, index }) => (
          <circle
            key={slice.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            className="donut-segment"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <title>{`${slice.label}: ${slice.value}`}</title>
          </circle>
        ))}
      </svg>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}

export function BarChart({
  items,
  height = 180,
  formatValue,
}: {
  items: { key: string; label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const uid = useId();
  const max = Math.max(...items.map((i) => i.value), 1);
  const labelH = 26;
  const plotH = Math.max(height - labelH, 80);
  const sparse = items.length > 10;

  return (
    <div className="flex w-full items-end gap-1 sm:gap-1.5" style={{ height }}>
      {items.map((item, i) => {
        const barH =
          item.value > 0
            ? Math.max(Math.round((item.value / max) * plotH), 8)
            : 3;
        return (
          <div
            key={item.key}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div
              className="relative flex w-full items-end justify-center"
              style={{ height: plotH }}
            >
              {item.value > 0 && (
                <span className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 rounded-md bg-[var(--foreground)] px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                  {formatValue ? formatValue(item.value) : item.value}
                </span>
              )}
              <div
                className="bar-rise w-full max-w-10 overflow-hidden rounded-t-lg"
                style={{
                  height: barH,
                  animationDelay: `${80 + i * 35}ms`,
                }}
                title={`${item.label}: ${item.value}`}
              >
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      item.value > 0
                        ? `linear-gradient(180deg, ${item.color ?? `var(--primary)`} 0%, color-mix(in srgb, ${item.color ?? 'var(--primary)'} 62%, var(--sky)) 100%)`
                        : 'var(--border)',
                  }}
                />
              </div>
            </div>
            <span
              className={`h-[18px] w-full truncate text-center text-[10px] leading-[18px] text-[var(--muted-foreground)] ${
                sparse && i % 2 !== 0 ? 'invisible sm:visible' : ''
              }`}
            >
              {item.label}
            </span>
          </div>
        );
      })}
      <span className="sr-only" id={uid}>
        Bar chart
      </span>
    </div>
  );
}

export function AreaChart({
  items,
  height = 180,
  formatValue,
}: {
  items: { key: string; label: string; value: number }[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const uid = useId();
  const max = Math.max(...items.map((i) => i.value), 1);
  const padX = 4;
  const padY = 10;
  const w = 100;
  const h = 72;
  const points = items.map((item, i) => {
    const x =
      items.length === 1
        ? w / 2
        : padX + (i / (items.length - 1)) * (w - padX * 2);
    const y = padY + (1 - item.value / max) * (h - padY * 2);
    return { ...item, x, y };
  });
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L ${last?.x ?? w - padX} ${h} L ${first?.x ?? padX} ${h} Z`;
  const sparse = items.length > 10;

  return (
    <div className="anim-fade-in w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-[calc(100%-1.5rem)] w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={w - padX}
            y1={padY + g * (h - padY * 2)}
            y2={padY + g * (h - padY * 2)}
            stroke="var(--border)"
            strokeWidth="0.35"
            strokeDasharray="1.2 1.4"
          />
        ))}
        <path d={area} fill={`url(#${uid}-fill)`} />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p) => (
          <g key={p.key}>
            <circle
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill="var(--card)"
              stroke="var(--primary)"
              strokeWidth="1.3"
              vectorEffect="non-scaling-stroke"
              className="opacity-0 transition-opacity hover:opacity-100"
            >
              <title>
                {p.label}: {formatValue ? formatValue(p.value) : p.value}
              </title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 px-0.5">
        {items.map((item, i) => (
          <span
            key={item.key}
            className={`min-w-0 flex-1 truncate text-center text-[10px] text-[var(--muted-foreground)] ${
              sparse && i % 2 !== 0 ? 'invisible sm:visible' : ''
            }`}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  className = '',
}: {
  values: number[];
  className?: string;
}) {
  const uid = useId();
  const max = Math.max(...values, 1);
  const w = 88;
  const h = 32;
  const pts = values.map((v, i) => {
    const x = values.length <= 1 ? w / 2 : (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 6) - 3;
    return { x, y };
  });
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L ${last?.x ?? w} ${h} L ${first?.x ?? 0} ${h} Z`;

  if (!values.length) return null;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-sp`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid}-sp)`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HorizontalBars({
  items,
}: {
  items: {
    key: string;
    label: string;
    value: number;
    meta?: string;
    color?: string;
  }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  if (!items.length) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
        No data to display
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <li
            key={item.key}
            className="anim-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--muted)] text-[10px] font-semibold tabular-nums text-[var(--muted-foreground)]">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-medium text-[var(--foreground)]">
                  {item.label}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">
                {item.meta ?? item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="bar-fill h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    item.color ??
                    'linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--sky)))',
                  animationDelay: `${80 + i * 50}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StackedBar({ slices }: { slices: ChartSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]"
      role="img"
      aria-label="Status breakdown"
    >
      {slices.map((slice) =>
        slice.value > 0 ? (
          <div
            key={slice.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(slice.value / total) * 100}%`,
              backgroundColor: slice.color,
            }}
            title={`${slice.label}: ${slice.value}`}
          />
        ) : null,
      )}
    </div>
  );
}
