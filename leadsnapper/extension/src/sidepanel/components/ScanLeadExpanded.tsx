import { useState } from 'react'
import type { ScanLead } from '../../types/scan'
import { lookupUrls } from '../../types/scan'
import type { AppSettings, EnrichmentProvider } from '../../types/settings'
import {
  chBlocksOwnerLookup,
  chEndpointSummary,
  chIsReady,
  chLiveModeActive,
  hasCompaniesHouseData,
} from '../../utils/companiesHouse'

interface Props {
  lead: ScanLead
  settings: AppSettings
  settingsLoaded?: boolean
  defaultProvider: EnrichmentProvider
  onUpdate: (p: Partial<ScanLead>) => void
  onReenrich: () => void
  onB2bEnrich: (provider: EnrichmentProvider) => void
  onOpenSettings?: () => void
}

type Panel = 'contact' | 'owner' | 'qualify'

export default function ScanLeadExpanded({ lead, settings, settingsLoaded = true, defaultProvider, onUpdate, onReenrich, onB2bEnrich, onOpenSettings }: Props) {
  const [panel, setPanel] = useState<Panel>('contact')
  const smbMode = settings.localSmbMode
  const [provider, setProvider] = useState<EnrichmentProvider>(smbMode ? 'waterfall' : defaultProvider)
  const [showLinks, setShowLinks] = useState(false)
  const e = lead.enriched
  const lu = lookupUrls(lead)

  function toggleService(svc: string) {
    const cur = lead.serviceFit ?? []
    onUpdate({ serviceFit: cur.includes(svc) ? cur.filter(s => s !== svc) : [...cur, svc] })
  }

  const brandServices = lead.brandFit
    ? settings.brands.find(b => b.name === lead.brandFit)?.services ?? []
    : settings.brands.flatMap(b => b.services)

  const panels: { id: Panel; label: string }[] = [
    { id: 'contact', label: 'Contact' },
    { id: 'owner', label: 'Owner' },
    { id: 'qualify', label: 'Qualify' },
  ]

  return (
    <div className="bg-gray-50 px-3 pb-3 pt-1 border-t border-gray-100 space-y-2">
      <div className="flex gap-1">
        {panels.map(p => (
          <button
            key={p.id}
            onClick={() => setPanel(p.id)}
            className={`flex-1 text-xs py-1.5 rounded font-medium ${panel === p.id ? 'bg-navy-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {panel === 'contact' && (
        <div className="space-y-2 text-xs">
          {(lead.phone || e?.primaryPhone) && <Row label="Phone" value={e?.primaryPhone ?? lead.phone ?? ''} />}
          {e?.primaryEmail && <Row label="Email" value={e.primaryEmail} />}
          {(lead.websiteUrl || e?.gmbWebsiteUrl) && <Row label="Website" value={lead.websiteUrl || e?.gmbWebsiteUrl || ''} link />}
          {e?.whatsappUrl && <Row label="WhatsApp" value={e.whatsappUrl} link />}
          {e?.techStack && e.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">{e.techStack.map(t => <span key={t} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>)}</div>
          )}
          <div className="flex flex-wrap gap-1">
            <Chip ok={e?.hasContactForm} label="Form" />
            <Chip ok={e?.hasOnlineOrdering} label="Orders" invert />
            <Chip ok={e?.hasBookingSystem} label="Booking" invert />
            <Chip ok={e?.hasChatWidget === false} label="No chat" good />
          </div>
          <button onClick={() => setShowLinks(v => !v)} className="text-xs text-navy-600 hover:underline">
            {showLinks ? 'Hide' : 'Show'} research links
          </button>
          {showLinks && (
            <div className="flex flex-wrap gap-1">
              {Object.entries({ 'CH': lu.companiesHouse, 'LinkedIn': lu.linkedinSearch, 'Director': lu.directorSearch }).map(([k, href]) => (
                <a key={k} href={href} target="_blank" rel="noreferrer" className="bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded no-underline hover:border-navy-400">{k}</a>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === 'owner' && (
        <div className="space-y-2 text-xs">
          {(e?.ownerName || lead.ownerName) && !lead.exploriumData?.companiesHouseMatched && (
            <div className="font-medium text-gray-800">
              {e?.ownerName || lead.ownerName}
              {e?.ownerTitle && <span className="text-gray-500 font-normal ml-1">· {e.ownerTitle}</span>}
            </div>
          )}
          {(e?.teamMembers?.length ?? 0) > 0 && (
            <div className="space-y-1 border-t border-gray-100 pt-1">
              {e!.teamMembers!.slice(0, 4).map((m, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-medium">{m.name}</span>
                  {m.title && <span className="text-gray-400">{m.title}</span>}
                </div>
              ))}
            </div>
          )}

          {(lead.enrichStatus === 'pending' || lead.enrichStatus === 'enriching') ? (
            <div className="text-amber-600 flex items-center gap-1"><Spin /> Waiting for website scan…</div>
          ) : (
            <>
              {(lead.exploriumStatus === 'done' || hasCompaniesHouseData(lead)) && (
                <OwnerEnrichmentResults
                  lead={lead}
                  data={lead.exploriumData}
                  businessName={lead.businessName}
                  chOnly={settings.companiesHouseOnlyTest}
                  market={detectLeadMarket(lead, settings)}
                  onUpdate={onUpdate}
                />
              )}
              {lead.exploriumStatus === 'loading' && (
                <div className="text-amber-600 flex items-center gap-1"><Spin /> {settings.companiesHouseOnlyTest ? 'Querying Companies House…' : 'Fetching owner data…'}</div>
              )}
              {lead.exploriumStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 space-y-2">
                  <div className="text-red-700">{lead.exploriumError}</div>
                  {(lead.exploriumError?.includes('API key') || lead.exploriumError?.includes('MISSING')) && onOpenSettings && (
                    <button type="button" onClick={onOpenSettings} className="text-xs font-semibold text-navy-600 hover:underline">
                      Open Settings → UK Companies House
                    </button>
                  )}
                </div>
              )}

              {!lead.exploriumStatus && (
                <div className="text-[11px] text-gray-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2 leading-relaxed">
                  Website / Maps scrape fills emails, phones, and social links automatically.
                  Paid owner-lookup APIs have been removed from LeadSnapper.
                </div>
              )}
              {lead.exploriumStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs">
                  {lead.exploriumError || 'Lookup unavailable in scrape-only mode.'}
                </div>
              )}
              {false && !lead.exploriumStatus && (
                <>
                  {(() => {
                    const chBlock = chBlocksOwnerLookup(settings, settingsLoaded)
                    void chBlock
                    void onB2bEnrich
                    void smbMode
                    void provider
                    return null
                  })()}
                </>
              )}
              {lead.exploriumStatus === 'failed' && chBlocksOwnerLookup(settings, settingsLoaded).ok && (
                <button onClick={() => onB2bEnrich(smbMode ? 'waterfall' : provider)} className="btn-xs bg-red-50 text-red-600 w-full py-2">Retry lookup</button>
              )}
            </>
          )}

          {!hasCompaniesHouseData(lead) && lead.exploriumStatus !== 'done' && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <Field label="Owner" value={lead.ownerName} onChange={v => onUpdate({ ownerName: v })} />
              <Field label="Director" value={lead.directorName} onChange={v => onUpdate({ directorName: v })} />
            </div>
          )}
          <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lead.verified} onChange={e => onUpdate({ verified: e.target.checked })} className="accent-navy-600" />
            Verified
          </label>
        </div>
      )}

      {panel === 'qualify' && (
        <div className="space-y-2 text-xs">
          <p className="text-gray-500">Brand / keyword qualification removed — scrape-only mode.</p>
          <textarea className="input resize-none" rows={2} placeholder="Notes…" value={lead.userNotes ?? ''} onChange={e => onUpdate({ userNotes: e.target.value })} />
          <button onClick={onReenrich} className="btn-xs bg-amber-50 text-amber-700">Re-scan website</button>
        </div>
      )}
    </div>
  )
}

function detectLeadMarket(lead: ScanLead, _settings: AppSettings): 'UK' | 'US' {
  const c = (lead.country ?? '').toLowerCase()
  if (c.includes('united states') || c === 'usa' || c === 'us') return 'US'
  return 'UK'
}

function OwnerEnrichmentResults({ lead, data, businessName, chOnly, market, onUpdate }: {
  lead: ScanLead
  data?: ScanLead['exploriumData']
  businessName: string
  chOnly: boolean
  market: 'UK' | 'US'
  onUpdate: (p: Partial<ScanLead>) => void
}) {
  void chOnly
  void market
  void businessName
  return (
    <div className="text-xs text-gray-500">
      {lead.ownerName || data?.ownerName || 'No owner data (scrape-only)'}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-400">{label}</span>
      <input className="input mt-0.5" value={value ?? ''} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function FieldArea({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-400">{label}</span>
      <textarea className="input mt-0.5 resize-none" rows={2} value={value ?? ''} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-14 shrink-0">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-navy-600 truncate hover:underline">
          {value}
        </a>
      ) : (
        <span className="text-gray-700 truncate">{value}</span>
      )}
    </div>
  )
}

function Chip({
  ok,
  label,
  invert,
  good,
}: {
  ok?: boolean
  label: string
  invert?: boolean
  good?: boolean
}) {
  if (ok === undefined) return null
  const show = invert ? ok === false : good ? ok : ok === true
  if (!show && !invert && !good) return null
  return (
    <span
      className={`px-1.5 py-0.5 rounded ${show ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}
    >
      {label}
    </span>
  )
}

function Spin() {
  return <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}
