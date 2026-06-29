type MarketingIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

const ICON_FONT = "'Material Symbols Outlined'";

export function MarketingIcon({ name, className = '', filled }: MarketingIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontFamily: ICON_FONT,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}
