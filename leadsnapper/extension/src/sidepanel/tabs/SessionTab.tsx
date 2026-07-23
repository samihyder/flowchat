import { useState } from 'react'
import type { Lead, LeadStatus } from '../../types/lead'
import { LEAD_STATUSES, TEAM_MEMBERS, NEXT_ACTIONS } from '../../types/lead'

interface Props {
  leads: Lead[]
  selectedLeads: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onUpdate: (leadId: string, patch: Partial<Lead>) => void
  onDelete: (leadId: string) => void
  onEnrichLead: (leadId: string, url: string) => void
}

export default function SessionTab({ leads, selectedLeads, onToggleSelect, onSelectAll, onSelectNone, onUpdate, onDelete, onEnrichLead }: Props) {
  const [expanding, setExpanding] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const filtered = leads.filter(l =>
    !filter || [l.businessName, l.city, l.domain, l.brandFit, l.leadPriority, l.leadStatus, l.ownerName]
      .join(' ').toLowerCase().includes(filter.toLowerCase())
  )

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-8 space-y-2">
        <p className="text-sm font-medium text-gray-600">Pipeline is empty</p>
        <p className="text-xs">Scan Google results, select leads, then click <strong>Add to Pipeline</strong>.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      <input className="input" placeholder="Filter pipeline…" value={filter} onChange={e => setFilter(e.target.value)} />
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span>{filtered.length} leads</span>
        {selectedLeads.size > 0 && <span className="text-navy-600 font-medium">{selectedLeads.size} selected</span>}
        <div className="ml-auto flex gap-1">
          <button onClick={onSelectAll} className="btn-xs bg-gray-100 text-gray-600">All</button>
          <button onClick={onSelectNone} className="btn-xs bg-gray-100 text-gray-600">None</button>
        </div>
      </div>

      {filtered.map(lead => (
        <LeadCard
          key={lead.leadId}
          lead={lead}
          selected={selectedLeads.has(lead.leadId)}
          expanded={expanding === lead.leadId}
          onToggleSelect={() => onToggleSelect(lead.leadId)}
          onToggleExpand={() => setExpanding(expanding === lead.leadId ? null : lead.leadId)}
          onUpdate={patch => onUpdate(lead.leadId, patch)}
          onDelete={() => { onDelete(lead.leadId); if (expanding === lead.leadId) setExpanding(null) }}
          onEnrich={url => onEnrichLead(lead.leadId, url)}
        />
      ))}
    </div>
  )
}

function LeadCard({ lead, selected, expanded, onToggleSelect, onToggleExpand, onUpdate, onDelete, onEnrich }: {
  lead: Lead; selected: boolean; expanded: boolean
  onToggleSelect: () => void; onToggleExpand: () => void
  onUpdate: (p: Partial<Lead>) => void; onDelete: () => void; onEnrich: (url: string) => void
}) {
  const dot = lead.leadPriority === 'Hot' ? 'bg-red-500' : lead.leadPriority === 'Warm' ? 'bg-amber-500' : 'bg-gray-300'

  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${selected ? 'border-navy-600' : 'border-gray-200'}`}>
      <div className="flex items-start gap-2 p-2.5 cursor-pointer" onClick={onToggleExpand}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} onClick={e => e.stopPropagation()} className="mt-0.5 accent-navy-600" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 text-xs truncate">{lead.businessName ?? 'Unknown'}</div>
          <div className="text-gray-400 text-xs truncate">
            {[lead.city, lead.phone || lead.ownerMobile, lead.brandFit].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <CrmBadge status={lead.crmSyncStatus} />
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs font-bold text-gray-600">{lead.leadScore}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-2.5 bg-gray-50 space-y-3 text-xs">
          {/* Contact snapshot */}
          <div className="space-y-0.5 text-gray-700">
            {(lead.phone || lead.gmbPhone) && <div>📞 Business: {lead.phone || lead.gmbPhone}</div>}
            {(lead.ownerPhone || lead.ownerMobile) && <div>📱 Owner: {lead.ownerMobile || lead.ownerPhone}</div>}
            {(lead.email || lead.primaryEmail) && <div>✉ {lead.email || lead.primaryEmail}</div>}
            {lead.ownerName && <div>👤 {lead.ownerName}{lead.ownerTitle ? ` · ${lead.ownerTitle}` : ''}</div>}
            {lead.linkedinUrl && <div>🏢 LinkedIn: <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-navy-600">company</a></div>}
            {lead.decisionMakerLinkedin && <div>🔗 Owner LinkedIn: <a href={lead.decisionMakerLinkedin} target="_blank" rel="noreferrer" className="text-navy-600">profile</a></div>}
            {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="text-navy-600 block truncate">{lead.domain || lead.website}</a>}
            {lead.crmSyncStatus === 'synced' && lead.crmContactId && (
              <div className="text-emerald-700">✓ Synced to CRM</div>
            )}
            {lead.crmSyncStatus === 'failed' && lead.crmSyncError && (
              <div className="text-red-600">CRM: {lead.crmSyncError}</div>
            )}
          </div>

          {/* Sales workflow */}
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Status">
              <select className="input mt-0.5" value={lead.leadStatus} onChange={e => onUpdate({ leadStatus: e.target.value as LeadStatus })}>
                {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Assigned">
              <select className="input mt-0.5" value={lead.assignedTo ?? ''} onChange={e => onUpdate({ assignedTo: e.target.value })}>
                <option value="">—</option>
                {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Next action">
              <select className="input mt-0.5" value={lead.nextAction ?? ''} onChange={e => onUpdate({ nextAction: e.target.value })}>
                <option value="">—</option>
                {NEXT_ACTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Follow-up">
              <input type="date" className="input mt-0.5" value={lead.followUpDate ?? ''} onChange={e => onUpdate({ followUpDate: e.target.value })} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea className="input mt-0.5 resize-none" rows={2} value={lead.notes ?? ''} onChange={e => onUpdate({ notes: e.target.value })} placeholder="Call notes, objections…" />
          </Field>

          {/* Compliance */}
          <details className="group">
            <summary className="cursor-pointer text-gray-500 font-medium">Compliance</summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Field label="Outreach basis">
                <input className="input mt-0.5" value={lead.outreachBasis} onChange={e => onUpdate({ outreachBasis: e.target.value })} />
              </Field>
              <Field label="Opt-out">
                <select className="input mt-0.5" value={lead.optOutStatus} onChange={e => onUpdate({ optOutStatus: e.target.value as Lead['optOutStatus'] })}>
                  <option>Active</option>
                  <option>Opted Out</option>
                </select>
              </Field>
              <label className="col-span-2 flex items-center gap-2 text-gray-600 cursor-pointer">
                <input type="checkbox" checked={lead.doNotContact} onChange={e => onUpdate({ doNotContact: e.target.checked })} className="accent-navy-600" />
                Do not contact
              </label>
              {lead.doNotContact && (
                <Field label="Suppression reason">
                  <input className="input mt-0.5" value={lead.suppressionReason ?? ''} onChange={e => onUpdate({ suppressionReason: e.target.value })} />
                </Field>
              )}
            </div>
          </details>

          {/* Enrich */}
          <EnrichBlock lead={lead} onUpdate={onUpdate} onEnrich={onEnrich} />

          <button onClick={onDelete} className="btn-xs bg-red-50 text-red-600 hover:bg-red-100">Remove from pipeline</button>
        </div>
      )}
    </div>
  )
}

function EnrichBlock({ lead, onUpdate, onEnrich }: { lead: Lead; onUpdate: (p: Partial<Lead>) => void; onEnrich: (url: string) => void }) {
  const [busy, setBusy] = useState(false)
  const url = lead.website ?? ''

  return (
    <details>
      <summary className="cursor-pointer text-gray-500 font-medium">Update links & enrich</summary>
      <div className="mt-2 space-y-1.5">
        <input className="input" placeholder="Website URL" value={lead.website ?? ''} onChange={e => onUpdate({ website: e.target.value, domain: e.target.value.replace(/^https?:\/\//, '').split('/')[0] })} />
        <input className="input" placeholder="LinkedIn URL" value={lead.linkedinUrl ?? ''} onChange={e => onUpdate({ linkedinUrl: e.target.value })} />
        {url && (
          <button
            onClick={() => { setBusy(true); onEnrich(url); setTimeout(() => setBusy(false), 12000) }}
            disabled={busy}
            className="w-full btn-xs bg-amber-50 text-amber-700 py-2 disabled:opacity-60"
          >
            {busy ? 'Enriching…' : 'Enrich from website'}
          </button>
        )}
      </div>
    </details>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span className="label">{label}</span>{children}</div>
}

function CrmBadge({ status }: { status: Lead['crmSyncStatus'] }) {
  if (status === 'synced') {
    return <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">CRM</span>
  }
  if (status === 'failed') {
    return <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">CRM!</span>
  }
  if (status === 'pending') {
    return <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">…</span>
  }
  return null
}
