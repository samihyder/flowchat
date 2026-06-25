type MarketingIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function MarketingIcon({ name, className = '', filled }: MarketingIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}
