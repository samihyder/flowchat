interface Props {
  onScan: () => void
  scanning: boolean
}

const SOURCES = [
  { title: 'Google Maps', hint: 'Search a city or category, open results, then Scan', href: 'https://www.google.com/maps' },
  { title: 'Google Places / Search', hint: 'Use the Places tab or local pack, then Scan', href: 'https://www.google.com/search?q=restaurants' },
  { title: 'Business website', hint: 'Open the company site, then Capture', href: undefined },
  { title: 'LinkedIn', hint: 'Company or person page → Capture', href: 'https://www.linkedin.com' },
  { title: 'Social profiles', hint: 'Facebook, Instagram, TikTok, X, YouTube, Threads → Capture', href: undefined },
] as const

export default function SearchTab({ onScan, scanning }: Props) {
  return (
    <div className="p-3 space-y-4">
      <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2.5 text-xs text-navy-800 space-y-1.5">
        <div className="font-semibold text-sm">LeadSnapper — scrape only</div>
        <p className="text-navy-700 leading-relaxed">
          This extension scrapes public business data from Google and profile pages.
          It does <strong>not</strong> call enrichment APIs, keywords banks, or presets.
        </p>
        <ol className="list-decimal list-inside space-y-0.5 text-navy-700">
          <li>Open Google Maps, Places, Search, a website, or a social profile</li>
          <li>Click <strong>Scan current page</strong> (lists) or use the Capture tab (single page)</li>
          <li>Review results → Export Excel or sync to FlowChat CRM</li>
        </ol>
      </div>

      <section className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Supported sources</div>
        <ul className="space-y-1.5">
          {SOURCES.map((s) => (
            <li
              key={s.title}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800">{s.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.hint}</div>
              </div>
              {s.href ? (
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[11px] font-medium text-navy-700 hover:underline"
                >
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <a
          href="https://www.google.com/search"
          target="_blank"
          rel="noreferrer"
          className="text-center bg-white border border-gray-200 hover:border-navy-500 text-gray-700 text-xs font-medium py-2.5 rounded-lg no-underline"
        >
          Open Google Search
        </a>
        <a
          href="https://www.google.com/maps"
          target="_blank"
          rel="noreferrer"
          className="text-center bg-white border border-gray-200 hover:border-blue-400 text-blue-700 text-xs font-medium py-2.5 rounded-lg no-underline"
        >
          Open Google Maps
        </a>
      </div>

      <button
        type="button"
        onClick={onScan}
        disabled={scanning}
        className="w-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {scanning ? <SpinIcon /> : <RadarIcon />}
        {scanning ? 'Scanning page…' : 'Scan current page'}
      </button>
    </div>
  )
}

function SpinIcon() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function RadarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0" />
      <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0" />
    </svg>
  )
}
