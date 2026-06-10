const colors = {
  primary: 'bg-primary-100 text-primary-700',
  accent: 'bg-teal-50 text-accent-600',
  gray: 'bg-gray-100 text-gray-600',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
};

export function Badge({
  children,
  color = 'gray',
}: {
  children: React.ReactNode;
  color?: keyof typeof colors;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
