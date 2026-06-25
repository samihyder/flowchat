/** Marketing module pages use the Stitch sidebar shell — no horizontal sub-nav. */
export default function MarketingPagesLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-full min-h-0 animate-fade-in">{children}</div>;
}
