'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { withBasePath } from '@/lib/base-path';
import { SettingsCard, AnnotationBox } from '@/components/ui/settings-page';
import { Button } from '@/components/ui/button';

const ZIP_HREF = withBasePath('/downloads/leadsnapper/leadsnapper-chrome.zip');

const STEPS = [
  {
    title: 'Download the Chrome package',
    body: 'Use the button below to download leadsnapper-chrome.zip from FlowChat.',
  },
  {
    title: 'Load unpacked in Chrome',
    body: 'Unzip → chrome://extensions → Developer mode → Load unpacked → select the folder that contains manifest.json.',
  },
  {
    title: 'Scrape Google & profiles',
    body: 'Open Maps, Places, Search, a website, LinkedIn, or a social profile. Use Scan (lists) or Capture (single page).',
  },
  {
    title: 'Export or sync to CRM',
    body: 'Export Excel from the extension, or enable LeadSnapper sync under CRM settings and push from the Sync tab.',
  },
] as const;

const SOURCES = [
  'Google Search',
  'Google Places',
  'Google Maps',
  'Business websites',
  'LinkedIn',
  'Facebook',
  'Instagram',
  'TikTok',
  'X / Twitter',
  'YouTube',
  'Threads',
] as const;

export default function LeadSnapperSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <SettingsCard title="LeadSnapper Chrome extension">
        <p className="text-sm text-gray-600 mb-4">
          Scrape local businesses and corporate profile links — no paid enrichment APIs, keywords, or
          presets.
        </p>
        <div className="rounded-xl border-2 border-primary-border bg-primary-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary-900">Download for Google Chrome</p>
            <p className="text-xs text-primary-800/80 mt-1">
              Version 2.0 · scrape-only package built for FlowChat CRM
            </p>
          </div>
          <a href={ZIP_HREF} download="leadsnapper-chrome.zip">
            <Button type="button">Download .zip</Button>
          </a>
        </div>

        <AnnotationBox>
          LeadSnapper only scrapes public page data. Enrichment APIs (Companies House waterfall,
          Openmart, Cognism, Lusha, PDL, Explorium), keyword banks, and brand presets were removed.
        </AnnotationBox>
      </SettingsCard>

      <SettingsCard title="Install & use">
        <p className="text-sm text-gray-600 mb-4">Four steps from download to CRM contacts.</p>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </SettingsCard>

      <SettingsCard title="Supported sources">
        <p className="text-sm text-gray-600 mb-3">Open the page in Chrome, then Scan or Capture.</p>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <span
              key={s}
              className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-900 border border-cyan-200"
            >
              {s}
            </span>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="CRM sync">
        <p className="text-sm text-gray-600 mb-3">
          Enable sync and set minimum priority on the CRM settings page. Create an API key under
          Integrations, then paste base URL + key into the extension Sync tab.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={'/settings/crm' as Route}>
            <Button type="button" variant="secondary">
              CRM sync settings
            </Button>
          </Link>
          <Link href={'/settings/integrations' as Route}>
            <Button type="button" variant="secondary">
              Integrations / API keys
            </Button>
          </Link>
        </div>
      </SettingsCard>
    </div>
  );
}
