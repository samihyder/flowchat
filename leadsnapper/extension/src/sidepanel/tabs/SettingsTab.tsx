import { useState } from 'react'
import type { AppSettings } from '../../types/settings'

interface Props {
  settings: AppSettings
  onUpdate: (s: AppSettings) => void
}

export default function SettingsTab({ settings, onUpdate }: Props) {
  const [url, setUrl] = useState(settings.flowCrmApiUrl)
  const [key, setKey] = useState(settings.flowCrmApiKey)
  const [enabled, setEnabled] = useState(settings.flowCrmSyncEnabled)
  const [saved, setSaved] = useState(false)

  function save() {
    onUpdate({
      ...settings,
      flowCrmApiUrl: url.trim().replace(/\/$/, ''),
      flowCrmApiKey: key.trim(),
      flowCrmSyncEnabled: enabled,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-3 space-y-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 text-xs text-emerald-900">
        <div className="font-semibold">Scrape-only mode</div>
        <p className="mt-1 leading-relaxed">
          Brands, keywords, presets, and paid enrichment APIs have been removed.
          LeadSnapper only scrapes Google, websites, and social profiles. Configure FlowChat
          sync below (optional) — download + guide live in Flow CRM → Settings → LeadSnapper.
        </p>
      </div>

      <section className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          FlowChat CRM sync
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable push to FlowChat
        </label>
        <input
          className="input w-full text-xs"
          placeholder="https://your-app/api (FlowChat API base)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="input w-full text-xs font-mono"
          placeholder="Integration API key (Settings → Integrations)"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={save}
          className="w-full bg-navy-600 hover:bg-navy-700 text-white text-xs font-semibold py-2 rounded-lg"
        >
          {saved ? 'Saved' : 'Save sync settings'}
        </button>
      </section>

      <section className="text-[11px] text-gray-500 space-y-1 leading-relaxed">
        <p className="font-semibold text-gray-600">What we scrape</p>
        <p>
          Google Search · Google Places · Google Maps · business websites · LinkedIn · Facebook ·
          Instagram · TikTok · X/Twitter · YouTube · Threads
        </p>
      </section>
    </div>
  )
}
