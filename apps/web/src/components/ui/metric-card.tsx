export function MetricCard({
  label,
  value,
  hint,
  accent = 'primary',
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'primary' | 'accent' | 'amber' | 'rose';
}) {
  const accents = {
    primary: 'text-primary-600',
    accent: 'text-accent-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accents[accent]}`}>{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{children}</div>
  );
}
