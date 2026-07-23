import { useState } from 'react'
import type { Lead, ExtractedPageData, BrandFit, LeadStatus, SearchResult } from '../../types/lead'
import { LEAD_STATUSES, TEAM_MEMBERS, NEXT_ACTIONS } from '../../types/lead'
import type { AppSettings } from '../../types/settings'
import { scoreLead } from '../../scoring/scorer'
import { extractDomain } from '../../utils/regex'

interface Props {
  detected: ExtractedPageData | null
  draft: Partial<Lead>
  duplicateOf: Lead | null
  settings: AppSettings
  onUpdateDraft: (patch: Partial<Lead>) => void
  onSave: () => void
  onDismissDuplicate: () => void
  onUpdateExisting: () => void
  onSelectSearchResult: (r: SearchResult) => void
}

export default function CaptureTab({
  detected, draft, duplicateOf, settings,
  onUpdateDraft, onSave, onDismissDuplicate, onUpdateExisting, onSelectSearchResult,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const hasData = detected || Object.keys(draft).some(k =>
    !['brandFit','serviceFit','leadStatus','outreachBasis','optOutStatus','doNotContact','crmSyncStatus'].includes(k)
  )

  if (!hasData) return <IdleState />

  const { score, priority } = scoreLead(draft)

  // Google Search results list — show before the form
  if (!expanded && detected?.sourceType === 'Google Search' && (detected.searchResults?.length ?? 0) > 1) {
    return (
      <SearchResultsList
        results={detected.searchResults!}
        onSelect={r => { onSelectSearchResult(r); setExpanded(false) }}
        onSaveAll={() => onSave()}
      />
    )
  }

  return (
    <div className="p-3 space-y-3">
      {/* Duplicate warning */}
      {duplicateOf && (
        <DupWarning
          existing={duplicateOf}
          onDismiss={onDismissDuplicate}
          onUpdate={onUpdateExisting}
        />
      )}

      {/* Quick card — always visible */}
      <QuickCard
        draft={draft}
        score={score}
        priority={priority}
        detected={detected}
        settings={settings}
        onUpdate={onUpdateDraft}
        onSave={onSave}
        expanded={expanded}
        onToggleExpand={() => setExpanded(v => !v)}
      />

      {/* Full form — shown on demand */}
      {expanded && (
        <FullForm draft={draft} onUpdate={onUpdateDraft} />
      )}
    </div>
  )
}

// ── Quick Card ────────────────────────────────────────────────────────────────
// This is the default view. Goal: save a lead in under 3 seconds.

function QuickCard({ draft, score, priority, detected, settings, onUpdate, onSave, expanded, onToggleExpand }: {
  draft: Partial<Lead>
  score: number
  priority: string
  detected: ExtractedPageData | null
  settings: AppSettings
  onUpdate: (p: Partial<Lead>) => void
  onSave: () => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const priorityColor = priority === 'Hot' ? 'text-red-600' : priority === 'Warm' ? 'text-amber-600' : 'text-gray-500'
  const priorityBg    = priority === 'Hot' ? 'bg-red-50 border-red-200' : priority === 'Warm' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'

  return (
    <div className={`border rounded-xl p-3 space-y-2.5 ${priorityBg}`}>
      {/* Score + source */}
      <div className="flex items-center gap-2">
        <span className={`font-black text-2xl ${priorityColor}`}>{score}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          priority === 'Hot' ? 'bg-red-100 text-red-700' :
          priority === 'Warm' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-500'
        }`}>{priority}</span>
        {detected?.sourceType && (
          <span className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
            detected.sourceType === 'Google Maps'   ? 'bg-blue-100 text-blue-700' :
            detected.sourceType === 'Google Search' ? 'bg-purple-100 text-purple-700' :
            detected.sourceType === 'LinkedIn'      ? 'bg-sky-100 text-sky-700' :
            'bg-gray-100 text-gray-600'
          }`}>{detected.sourceType}</span>
        )}
      </div>

      {/* Editable name */}
      <input
        className="block w-full text-sm font-semibold text-gray-800 bg-white/70 border border-transparent hover:border-gray-300 focus:border-navy-600 focus:outline-none rounded-lg px-2.5 py-1.5 placeholder-gray-300"
        value={draft.businessName ?? ''}
        onChange={e => onUpdate({ businessName: e.target.value })}
        placeholder="Business name…"
      />

      {/* Key facts row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {draft.city    && <span>📍 {draft.city}</span>}
        {draft.phone   && <span>📞 {draft.phone}</span>}
        {draft.email   && <span>✉ {draft.email}</span>}
        {draft.website && <a href={draft.website} target="_blank" rel="noreferrer" className="text-navy-600 hover:underline">🔗 {draft.domain}</a>}
        {draft.googleRating   !== undefined && <span>⭐ {draft.googleRating}</span>}
        {draft.googleReviews  !== undefined && <span>💬 {draft.googleReviews}</span>}
      </div>

      {/* Tech signals (compact) */}
      {draft.technologyDetected && draft.technologyDetected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {draft.technologyDetected.map(t => (
            <span key={t} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">{t}</span>
          ))}
          {draft.hasChatWidget === false && <span className="bg-red-50 text-red-600 text-xs px-1.5 py-0.5 rounded">No Chat</span>}
          {draft.hasOnlineOrdering === false && <span className="bg-red-50 text-red-600 text-xs px-1.5 py-0.5 rounded">No Orders</span>}
        </div>
      )}

      {/* Brand / service inline — compact chips */}
      <BrandServiceRow draft={draft} settings={settings} onUpdate={onUpdate} />

      {/* Action row */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onToggleExpand}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          {expanded ? '↑ Less' : '↓ Edit details'}
        </button>
        <button
          onClick={onSave}
          className="ml-auto bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold px-6 py-2 rounded-lg flex items-center gap-1.5"
        >
          Save <span className="opacity-70 text-xs font-normal">↵</span>
        </button>
      </div>
    </div>
  )
}

// ── Brand / Service row (compact, inline) ─────────────────────────────────────

function BrandServiceRow({ draft, settings, onUpdate }: {
  draft: Partial<Lead>
  settings: AppSettings
  onUpdate: (p: Partial<Lead>) => void
}) {
  const selectedBrand = settings.brands.find(b => b.name === draft.brandFit)
  const services      = selectedBrand?.services ?? settings.brands.flatMap(b => b.services)

  function toggleService(svc: string) {
    const current = draft.serviceFit ?? []
    onUpdate({ serviceFit: current.includes(svc) ? current.filter(s => s !== svc) : [...current, svc] })
  }

  return (
    <div className="space-y-1.5">
      {/* Brand buttons */}
      <div className="flex gap-1">
        {settings.brands.map(b => (
          <button
            key={b.id}
            onClick={() => onUpdate({ brandFit: b.name as BrandFit, serviceFit: [] })}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              draft.brandFit === b.name
                ? 'bg-navy-600 text-white border-navy-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-navy-600'
            }`}
          >
            {b.name.split(' ')[0]}
          </button>
        ))}
        <button
          onClick={() => onUpdate({ brandFit: 'Both' })}
          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
            draft.brandFit === 'Both'
              ? 'bg-navy-600 text-white border-navy-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-navy-600'
          }`}
        >
          Both
        </button>
      </div>

      {/* Service chips — only those relevant to selected brand */}
      {services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {services.map(svc => (
            <button
              key={svc}
              onClick={() => toggleService(svc)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                draft.serviceFit?.includes(svc)
                  ? 'bg-navy-600 text-white border-navy-600'
                  : 'bg-white/70 text-gray-500 border-gray-200 hover:border-navy-600'
              }`}
            >
              {svc}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Full Form (Edit Details) ──────────────────────────────────────────────────

function FullForm({ draft, onUpdate }: {
  draft: Partial<Lead>
  onUpdate: (p: Partial<Lead>) => void
}) {
  return (
    <div className="space-y-2">
      <Card label="Business Details">
        <FI label="Business Name" value={draft.businessName} onChange={v => onUpdate({ businessName: v })} />
        <FI label="Website"       value={draft.website}      onChange={v => onUpdate({ website: v, domain: extractDomain(v) })} />
        <div className="grid grid-cols-2 gap-1.5">
          <FI label="Phone"  value={draft.phone}  onChange={v => onUpdate({ phone: v })} />
          <FI label="Email"  value={draft.email}  onChange={v => onUpdate({ email: v })} />
        </div>
        <FI label="Address" value={draft.address} onChange={v => onUpdate({ address: v })} />
        <div className="grid grid-cols-2 gap-1.5">
          <FI label="City"    value={draft.city}    onChange={v => onUpdate({ city: v })} />
          <FI label="Country" value={draft.country} onChange={v => onUpdate({ country: v })} />
        </div>
        <FI label="Category / Industry" value={draft.category} onChange={v => onUpdate({ category: v })} />
      </Card>

      <Card label="Sales">
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="label">Status</label>
            <select className="input mt-0.5" value={draft.leadStatus ?? 'New'} onChange={e => onUpdate({ leadStatus: e.target.value as LeadStatus })}>
              {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned To</label>
            <select className="input mt-0.5" value={draft.assignedTo ?? ''} onChange={e => onUpdate({ assignedTo: e.target.value })}>
              <option value="">Unassigned</option>
              {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Next Action</label>
            <select className="input mt-0.5" value={draft.nextAction ?? ''} onChange={e => onUpdate({ nextAction: e.target.value })}>
              <option value="">—</option>
              {NEXT_ACTIONS.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Follow-up</label>
            <input type="date" className="input mt-0.5" value={draft.followUpDate ?? ''} onChange={e => onUpdate({ followUpDate: e.target.value })} />
          </div>
        </div>
        <textarea className="input resize-none" rows={2} placeholder="Notes…" value={draft.notes ?? ''} onChange={e => onUpdate({ notes: e.target.value })} />
      </Card>
    </div>
  )
}

// ── Google Search Results List ────────────────────────────────────────────────

function SearchResultsList({ results, onSelect, onSaveAll }: {
  results: SearchResult[]
  onSelect: (r: SearchResult) => void
  onSaveAll: () => void
}) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">{results.length} results detected</span>
        <button onClick={onSaveAll} className="btn-xs bg-navy-600 hover:bg-navy-700 text-white">
          Save All
        </button>
      </div>
      <p className="text-xs text-gray-400">Tap a result to review and save it individually.</p>
      <div className="space-y-1.5">
        {results.map(r => (
          <button
            key={r.url}
            onClick={() => onSelect(r)}
            className="w-full text-left bg-white border border-gray-200 hover:border-navy-600 rounded-lg p-2.5 group transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-300 w-4 shrink-0 text-right mt-0.5">{r.rank}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate group-hover:text-navy-600">{r.title}</div>
                <div className="text-xs text-gray-400 truncate">{r.domain}</div>
                {r.snippet && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.snippet}</div>}
              </div>
              <span className="text-navy-400 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Duplicate Warning ─────────────────────────────────────────────────────────

function DupWarning({ existing, onDismiss, onUpdate }: { existing: Lead; onDismiss: () => void; onUpdate: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
      <div className="text-xs font-semibold text-amber-800">⚠ Duplicate: {existing.businessName}</div>
      <div className="flex gap-2 mt-1.5">
        <button onClick={onDismiss} className="btn-xs bg-amber-100 hover:bg-amber-200 text-amber-800">Save as new</button>
        <button onClick={onUpdate}  className="btn-xs bg-amber-600 hover:bg-amber-700 text-white">Update existing</button>
      </div>
    </div>
  )
}

// ── Idle State ────────────────────────────────────────────────────────────────

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center h-56 text-gray-400 text-center px-8">
      <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <p className="text-sm leading-relaxed">
        Go to a <strong className="text-gray-600">LinkedIn profile</strong>, <strong className="text-gray-600">company page</strong>, <strong className="text-gray-600">Google Maps listing</strong>, or <strong className="text-gray-600">business website</strong> and press <strong className="text-gray-600">Capture Page</strong>.
      </p>
    </div>
  )
}

// ── Micro-components ──────────────────────────────────────────────────────────

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
      {children}
    </div>
  )
}

function FI({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-0.5" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={label} />
    </div>
  )
}
