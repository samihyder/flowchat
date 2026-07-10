'use client';

type BarPoint = { label: string; value: number };

export function VolumeBarChart({
  data,
  valueLabel = 'conversations',
}: {
  data: BarPoint[];
  valueLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No data for this period.</p>;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${Math.max(400, data.length * 56)} 140`} className="w-full h-[140px]">
        {data.map((d, i) => {
          const barH = Math.max(8, (d.value / max) * 95);
          const x = 10 + i * 56;
          const y = 120 - barH;
          const isLast = i === data.length - 1;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={40}
                height={barH}
                rx={4}
                fill={isLast ? '#0891B2' : '#06B6D4'}
                opacity={d.value === 0 ? 0.25 : 1}
              />
              <text x={x + 20} y={132} fontSize={10} fill="#9CA3AF" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-gray-400 text-center mt-1">Bar height = {valueLabel} per day</p>
    </div>
  );
}

export function Csatsummary({
  average,
  resolved,
  open,
}: {
  average: number | null | undefined;
  resolved: number;
  open: number;
}) {
  const score = average ?? 0;
  const pct = Math.min(100, Math.max(0, (score / 5) * 100));

  return (
    <div className="flex gap-5 items-center">
      <div className="relative w-[120px] h-[120px] shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="6" />
          <circle
            cx="21"
            cy="21"
            r="15.9"
            fill="none"
            stroke="#10B981"
            strokeWidth="6"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
          {average != null ? `${average.toFixed(1)}★` : '—'}
        </div>
      </div>
      <div className="flex-1 text-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-gray-600">
            CSAT average: <strong className="text-gray-900">{average != null ? average.toFixed(1) : '—'}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          <span className="text-gray-600">
            Open: <strong className="text-gray-900">{open}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span className="text-gray-600">
            Resolved: <strong className="text-gray-900">{resolved}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
