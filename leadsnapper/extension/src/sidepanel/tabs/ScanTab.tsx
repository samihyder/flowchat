import { useState } from 'react'
import type { ScanLead } from '../../types/scan'
import type { AppSettings, EnrichmentProvider } from '../../types/settings'
import { exportScanLeads } from '../../export/scanExporter'
import ScanLeadExpanded from '../components/ScanLeadExpanded'

interface Props {
  leads: ScanLead[]
  scanning: boolean
  settings: AppSettings
  settingsLoaded?: boolean
  filteredCount: number
  configFilteredCount?: number
  onScan: () => void
  onOpenPlacesTab?: () => void
  onOpenGoogleMaps?: () => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onSelectHot: () => void
  onUpdateLead: (id: string, patch: Partial<ScanLead>) => void
  onReenrich: (lead: ScanLead) => void
  onExploriumEnrich: (lead: ScanLead, provider: EnrichmentProvider) => void
  onOpenSettings?: () => void
  onSaveToSession: (ids: string[]) => void
  sessionCount: number
  searchQuery?: string
}

export default function ScanTab({
  leads, scanning, settings, settingsLoaded = true, filteredCount, configFilteredCount = 0, onScan,
  onOpenPlacesTab, onOpenGoogleMaps, onExploriumEnrich,
  onToggleSelect, onSelectAll, onSelectNone, onSelectHot,
  onUpdateLead, onReenrich, onOpenSettings, onSaveToSession, sessionCount, searchQuery,
}: Props) {
  const [expanding, setExpanding] = useState<string | null>(null)
  const [filter, setFilter]       = useState<'all' | 'hot' | 'warm' | 'enriched'>('all')

  const selected = leads.filter(l => l.selected)
  const hot      = leads.filter(l => l.leadPriority === 'Hot')
  const enriched = leads.filter(l => l.enrichStatus === 'done')
  const enriching = leads.filter(l => l.enrichStatus === 'enriching').length

  const visible = leads.filter(l => {
    if (filter === 'hot')      return l.leadPriority === 'Hot'
    if (filter === 'warm')     return l.leadPriority === 'Warm'
    if (filter === 'enriched') return l.enrichStatus === 'done'
    return true
  })

  function doExport() {
    const toExport = selected.length > 0 ? selected : leads
    exportScanLeads(toExport, searchQuery)
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-gray-400 text-center px-6 py-8 space-y-4">
        <RadarIcon className="w-14 h-14 opacity-20" />
        <div>
          <p className="text-sm font-medium text-gray-600">No local businesses detected yet</p>
          <p className="text-xs mt-2 text-gray-400 leading-relaxed">
            LeadSnapper captures <strong>Google Places / Maps</strong> listings only — not blogs or AI summaries.
            On a regular search page, click <strong>Scan</strong> or switch to the <strong>Places</strong> tab for a full list.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={onScan}
            disabled={scanning}
            className="bg-navy-600 hover:bg-navy-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {scanning ? <><SpinIcon /> Scanning…</> : <><RadarSmall /> Scan Google page</>}
          </button>
          {onOpenPlacesTab && (
            <button
              onClick={onOpenPlacesTab}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg"
            >
              Open Places tab
            </button>
          )}
          {onOpenGoogleMaps && (
            <button
              onClick={onOpenGoogleMaps}
              className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg"
            >
              Open Google Maps
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-3 py-2 space-y-2">
        {/* Stats + scan */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{leads.length} results</span>
          {(filteredCount + configFilteredCount) > 0 && (
            <span className="text-xs text-gray-400" title="Removed by classifier or search filters">
              {filteredCount + configFilteredCount} filtered
            </span>
          )}
          {sessionCount > 0 && <span className="text-xs text-navy-600">{sessionCount} in pipeline</span>}
          {enriching > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <SpinIcon /> Enriching {enriching}…
            </span>
          )}
          {enriching === 0 && enriched.length > 0 && (
            <span className="text-xs text-green-600">✓ {enriched.length} enriched</span>
          )}
          <button
            onClick={onScan}
            disabled={scanning}
            className="ml-auto btn-xs bg-navy-600 hover:bg-navy-700 text-white flex items-center gap-1 disabled:opacity-60"
          >
            {scanning ? <SpinIcon /> : <RadarSmall />}
            {scanning ? 'Scanning…' : leads.length > 0 ? 'Load more' : 'Scan'}
          </button>
        </div>

        {/* Filter + select */}
        <div className="flex items-center gap-1">
          {(['all','hot','warm','enriched'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-xs capitalize ${filter === f ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'all' ? `All ${leads.length}` :
               f === 'hot' ? `🔴 Hot ${hot.length}` :
               f === 'warm' ? `🟡 Warm ${leads.filter(l=>l.leadPriority==='Warm').length}` :
               `✓ ${enriched.length}`}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <button onClick={onSelectAll}  className="btn-xs bg-gray-100 hover:bg-gray-200 text-gray-600">All</button>
            <button onClick={onSelectNone} className="btn-xs bg-gray-100 hover:bg-gray-200 text-gray-600">None</button>
            <button onClick={onSelectHot}  className="btn-xs bg-red-50 hover:bg-red-100 text-red-600">Hot</button>
          </div>
        </div>
      </div>

      {/* Lead list */}
      <div className="flex-1 overflow-y-auto">
        {visible.map(lead => (
          <LeadRow
            key={lead.id}
            lead={lead}
            settings={settings}
            expanded={expanding === lead.id}
            onToggleExpand={() => setExpanding(expanding === lead.id ? null : lead.id)}
            onToggleSelect={() => onToggleSelect(lead.id)}
            onUpdate={patch => onUpdateLead(lead.id, patch)}
            onReenrich={() => onReenrich(lead)}
            onExploriumEnrich={provider => onExploriumEnrich(lead, provider)}
            onOpenSettings={onOpenSettings}
            settingsLoaded={settingsLoaded}
            defaultProvider={settings.enrichmentProvider}
          />
        ))}
      </div>

      {/* Actions bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2.5 space-y-2">
        <div className="text-xs text-gray-500">
          {selected.length > 0 ? `${selected.length} selected` : `${leads.length} results`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSaveToSession(selected.length > 0 ? selected.map(l => l.id) : [])}
            disabled={selected.length === 0}
            className="flex-1 bg-navy-600 hover:bg-navy-700 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-lg"
          >
            Add to Pipeline
          </button>
          <button
            onClick={doExport}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
          >
            <ExcelIcon /> Excel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lead Row ──────────────────────────────────────────────────────────────────

interface RowProps {
  lead: ScanLead
  settings: AppSettings
  expanded: boolean
  onToggleExpand: () => void
  onToggleSelect: () => void
  onUpdate: (p: Partial<ScanLead>) => void
  onReenrich: () => void
  onExploriumEnrich: (provider: EnrichmentProvider) => void
  onOpenSettings?: () => void
  settingsLoaded?: boolean
  defaultProvider: EnrichmentProvider
}

function LeadRow({ lead, settings, settingsLoaded = true, expanded, onToggleExpand, onToggleSelect, onUpdate, onReenrich, onExploriumEnrich, onOpenSettings, defaultProvider }: RowProps) {
  const e = lead.enriched
  const priority = lead.leadPriority
  const priorityColor = priority === 'Hot' ? 'text-red-600' : priority === 'Warm' ? 'text-amber-600' : 'text-gray-400'

  return (
    <div className={`border-b border-gray-100 ${lead.selected ? 'bg-navy-50' : 'bg-white hover:bg-gray-50'}`}>
      {/* Summary row */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <input
          type="checkbox"
          checked={lead.selected}
          onChange={onToggleSelect}
          className="mt-0.5 shrink-0 accent-navy-600"
        />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800 truncate">{lead.businessName}</span>
            <EnrichBadge status={lead.enrichStatus} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
            {lead.city && <span>📍 {lead.city}</span>}
            {lead.googleRating !== undefined && <span>⭐ {lead.googleRating}{lead.googleReviews ? ` (${lead.googleReviews.toLocaleString()})` : ''}</span>}
            {lead.priceRange && <span className="text-green-600">{lead.priceRange}</span>}
            {(lead.phone || e?.primaryPhone) && <span>📞</span>}
            {e?.primaryEmail && <span>✉</span>}
            {lead.category && <span className="truncate max-w-24">{lead.category}</span>}
            {e?.techStack && e.techStack.length > 0 && <span className="text-blue-500">{e.techStack[0]}</span>}
          </div>
          {/* Signal pills */}
          <div className="flex flex-wrap gap-1 mt-1">
            {e?.chatWidgetProvider ? <Pill label={e.chatWidgetProvider} color="gray" /> : e?.hasChatWidget === false ? <Pill label="No Chat" color="red" /> : null}
            {e?.hasOnlineOrdering === false && <Pill label="No Orders" color="red" />}
            {e?.hasBookingSystem === false && <Pill label="No Booking" color="red" />}
            {e?.hasWhatsApp && <Pill label="WhatsApp" color="green" />}
            {e?.social?.linkedinCompany && <Pill label="LinkedIn ✓" color="blue" />}
            {e && e.emails.length > 0 && <Pill label={`${e.emails.length} email`} color="green" />}
            {(e?.businessListings?.length ?? 0) > 0 && <Pill label={`${e!.businessListings.length} listing${e!.businessListings.length > 1 ? 's' : ''}`} color="blue" />}
            {/* B2B enrichment results — visible on collapsed row */}
            {lead.exploriumStatus === 'loading' && <Pill label="B2B…" color="gray" />}
            {lead.exploriumData?.ownerMobile  && <Pill label="📱 Mobile" color="green" />}
            {lead.exploriumData?.ownerName && !lead.exploriumData?.ownerMobile && <Pill label="👤 Owner" color="blue" />}
            {lead.exploriumData?.ownerEmail  && <Pill label="✉ Owner email" color="green" />}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-sm font-black ${priorityColor}`}>{lead.leadScore}</span>
          <div className={`text-xs font-semibold ${priorityColor}`}>{priority}</div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <ScanLeadExpanded
          lead={lead}
          settings={settings}
          settingsLoaded={settingsLoaded}
          defaultProvider={defaultProvider}
          onUpdate={onUpdate}
          onReenrich={onReenrich}
          onB2bEnrich={onExploriumEnrich}
          onOpenSettings={onOpenSettings}
        />
      )}
    </div>
  )
}

// ── Micro-components ──────────────────────────────────────────────────────────

function EnrichBadge({ status }: { status: ScanLead['enrichStatus'] }) {
  if (status === 'done')      return <span className="text-xs text-green-600 font-medium">✓</span>
  if (status === 'enriching') return <SpinIcon />
  if (status === 'failed')    return <span className="text-xs text-red-400">✗</span>
  if (status === 'skipped')   return <span className="text-xs text-gray-300">–</span>
  return null
}

function Pill({ label, color }: { label: string; color: 'red' | 'green' | 'blue' | 'gray' }) {
  const c = { red: 'bg-red-50 text-red-600', green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-600', gray: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs px-1.5 py-0.5 rounded ${c[color]}`}>{label}</span>
}

function SpinIcon() {
  return <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}

function RadarIcon({ className }: { className?: string }) {
  return <svg className={className ?? 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.5}/><circle cx="12" cy="12" r="6" strokeWidth={1.5}/><circle cx="12" cy="12" r="2" strokeWidth={1.5}/><path d="M12 12 L18 6" strokeWidth={1.5} strokeLinecap="round"/></svg>
}

function RadarSmall() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><circle cx="12" cy="12" r="5" strokeWidth={2}/><path d="M12 12 L17 7" strokeWidth={2} strokeLinecap="round"/></svg>
}

function ExcelIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
}
