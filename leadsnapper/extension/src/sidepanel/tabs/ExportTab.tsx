import { useState } from 'react'
import type { Lead, SearchConfig } from '../../types/lead'
import type { AppSettings } from '../../types/settings'
import { exportToExcel } from '../../export/exporter'
import { isQualifiedLead, syncLeadsToFlowCrm } from '../../utils/leadToCrm'

interface Props {
  leads: Lead[]
  selectedLeads: Set<string>
  searchConfig: SearchConfig
  settings: AppSettings
  onClearSession: () => void
  onToast: (msg: string) => void
  onSyncResults: (results: { leadId: string | null; contactId: string; error?: string }[]) => void
}

export default function ExportTab({
  leads,
  selectedLeads,
  searchConfig,
  settings,
  onClearSession,
  onToast,
  onSyncResults,
}: Props) {
  const [syncing, setSyncing] = useState(false)

  function doExport(subset: Lead[], label: string) {
    if (subset.length === 0) { onToast('No leads to export'); return }
    exportToExcel(subset, searchConfig, settings.brands.map(b => b.name))
    onToast(`Exported ${subset.length} — ${label}`)
  }

  async function doSync(subset: Lead[], label: string) {
    if (subset.length === 0) { onToast('No leads to sync'); return }
    if (!settings.flowCrmApiUrl?.trim() || !settings.flowCrmApiKey?.trim()) {
      onToast('Configure Flow CRM in Settings')
      return
    }
    if (!settings.flowCrmSyncEnabled) {
      onToast('Enable Flow CRM sync in Settings')
      return
    }

    setSyncing(true)
    onToast(`Syncing ${subset.length} leads…`)
    try {
      const result = await syncLeadsToFlowCrm(settings, subset)
      onSyncResults(result.results)
      onToast(
        `CRM ${label}: ${result.created} created, ${result.updated} updated` +
        (result.skipped ? `, ${result.skipped} skipped` : '') +
        (result.failed ? `, ${result.failed} failed` : '')
      )
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'CRM sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const hot       = leads.filter(l => l.leadPriority === 'Hot')
  const warm      = leads.filter(l => l.leadPriority === 'Warm')
  const qualified = leads.filter(isQualifiedLead)
  const sel       = leads.filter(l => selectedLeads.has(l.leadId))
  const byBrand   = settings.brands.map(b => ({
    brand: b,
    leads: leads.filter(l => l.brandFit === b.name || l.brandFit === 'Both'),
  }))
  const crmReady  = !!(settings.flowCrmSyncEnabled && settings.flowCrmApiUrl?.trim() && settings.flowCrmApiKey?.trim())

  return (
    <div className="p-3 space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-600 mb-3">Pipeline summary</div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Total" value={leads.length} color="text-gray-700" />
          <Stat label="Hot" value={hot.length} color="text-red-600" />
          <Stat label="Warm" value={warm.length} color="text-amber-600" />
          <Stat label="Cold" value={leads.length - hot.length - warm.length} color="text-gray-400" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600">Export to Excel</div>
        <ExBtn label="Export all" count={leads.length} primary onClick={() => doExport(leads, 'all')} />
        {sel.length > 0 && <ExBtn label="Export selected" count={sel.length} onClick={() => doExport(sel, 'selected')} />}
        <div className="grid grid-cols-2 gap-1.5">
          <ExBtn label="Hot only" count={hot.length} onClick={() => doExport(hot, 'hot')} />
          <ExBtn label="Warm only" count={warm.length} onClick={() => doExport(warm, 'warm')} />
          {byBrand.map(({ brand, leads: brandLeads }) => (
            <ExBtn
              key={brand.id}
              label={brand.name}
              count={brandLeads.length}
              onClick={() => doExport(brandLeads, brand.name)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-600">Sync to Flow CRM</div>
        {!crmReady && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Add your FlowChat API URL and key in Settings, and enable LeadSnapper sync in FlowChat → Settings → CRM.
          </p>
        )}
        <CrmBtn
          label="Sync all"
          count={leads.length}
          primary
          disabled={syncing || !crmReady}
          onClick={() => void doSync(leads, 'all')}
        />
        <CrmBtn
          label="Sync qualified (Hot + Warm)"
          count={qualified.length}
          disabled={syncing || !crmReady}
          onClick={() => void doSync(qualified, 'qualified')}
        />
        {sel.length > 0 && (
          <CrmBtn
            label="Sync selected"
            count={sel.length}
            disabled={syncing || !crmReady}
            onClick={() => void doSync(sel, 'selected')}
          />
        )}
        {syncing && <p className="text-xs text-gray-500 text-center">Syncing to Flow CRM…</p>}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <button
          onClick={() => { if (confirm('Clear entire pipeline?')) onClearSession() }}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium py-2 rounded-lg"
        >
          Clear pipeline
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Pipeline clears when the browser closes.</p>
      </div>
    </div>
  )
}

function ExBtn({ label, count, onClick, primary }: { label: string; count: number; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} disabled={count === 0}
      className={`w-full flex justify-between text-xs font-medium py-2.5 px-3 rounded-lg disabled:opacity-40 ${primary ? 'bg-navy-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
      <span>{label}</span><span>{count}</span>
    </button>
  )
}

function CrmBtn({ label, count, onClick, primary, disabled }: {
  label: string; count: number; onClick: () => void; primary?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled || count === 0}
      className={`w-full flex justify-between text-xs font-medium py-2.5 px-3 rounded-lg disabled:opacity-40 ${
        primary ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-800'
      }`}>
      <span>{label}</span><span>{count}</span>
    </button>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-xs text-gray-400">{label}</div></div>
}
