'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FieldMappingGrid,
  type MappingRow,
} from '@/components/settings/enrichment/field-mapping-grid';
import {
  defaultMappingsForProvider,
  getProviderFieldSchema,
  LEAD_MONITOR_RECOMMENDED_STEPS,
  type FieldMappingEntry,
} from '@/lib/enrichment-field-schemas';

type FlowStep = {
  stepType: 'condition' | 'provider' | 'delay' | 'webhook';
  config: Record<string, unknown>;
};

type Flow = {
  id: string;
  name: string;
  enabled: boolean;
  trigger_on: string;
  steps: { id: string; stepOrder: number; stepType: string; config: Record<string, unknown> }[];
};

type Mapping = {
  id: string;
  provider: string;
  credential_id: string | null;
  field_mappings: Record<string, FieldMappingEntry>;
  enabled: boolean;
};

const STEP_LABELS: Record<string, string> = {
  condition: 'Condition',
  provider: 'Enrichment provider',
  delay: 'Delay',
  webhook: 'Webhook',
};

function mappingsToRows(
  provider: string,
  mappings: Record<string, FieldMappingEntry>
): MappingRow[] {
  const schema = getProviderFieldSchema(provider);
  const ordered = [...schema].sort(
    (a, b) =>
      (mappings[a.sourceKey]?.sortOrder ?? schema.indexOf(a)) -
      (mappings[b.sourceKey]?.sortOrder ?? schema.indexOf(b))
  );
  return ordered.map((field) => ({
    sourceKey: field.sourceKey,
    sourceLabel: field.label,
    mapping: mappings[field.sourceKey] ?? {
      label: field.label,
      targetKey: field.defaultTarget,
      attrType: field.attrType,
      enabled: false,
      sortOrder: schema.indexOf(field),
    },
  }));
}

function rowsToMappings(rows: MappingRow[]): Record<string, FieldMappingEntry> {
  return Object.fromEntries(
    rows.map((row, index) => [
      row.sourceKey,
      { ...row.mapping, label: row.sourceLabel, sortOrder: index },
    ])
  );
}

export default function EnrichmentFlowsPage() {
  const { token, accountId } = useAuthStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [credentials, setCredentials] = useState<{ id: string; provider: string; label: string }[]>(
    []
  );
  const [flowName, setFlowName] = useState('Lead → email & phone enrichment');
  const [steps, setSteps] = useState<FlowStep[]>(LEAD_MONITOR_RECOMMENDED_STEPS);
  const [mappingsByProvider, setMappingsByProvider] = useState<
    Record<string, Record<string, FieldMappingEntry>>
  >({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const providerSteps = useMemo(
    () =>
      steps
        .map((s, idx) => ({ step: s, idx }))
        .filter(({ step }) => step.stepType === 'provider'),
    [steps]
  );

  const load = useCallback(() => {
    if (!token || !accountId) return;
    api.enrichmentFlows.list(accountId, token).then((r) => {
      setFlows(r.flows as Flow[]);
      const loaded = r.mappings as Mapping[];
      setMappings(loaded);
      const byProvider: Record<string, Record<string, FieldMappingEntry>> = {};
      for (const m of loaded) {
        byProvider[m.provider] = m.field_mappings ?? {};
      }
      setMappingsByProvider(byProvider);
    });
    api.serviceCredentials.list(accountId, token, 'data_enrichment').then((r) => {
      setCredentials(
        r.credentials
          .filter((c) => c.status === 'active')
          .map((c) => ({ id: c.id, provider: c.provider, label: c.label }))
      );
    });
  }, [token, accountId]);

  useEffect(load, [load]);

  const activeFlow = flows[0];

  useEffect(() => {
    if (!activeFlow) return;
    setFlowName(activeFlow.name);
    if (activeFlow.steps?.length) {
      setSteps(
        activeFlow.steps.map((s) => ({
          stepType: s.stepType as FlowStep['stepType'],
          config: s.config ?? {},
        }))
      );
    }
  }, [activeFlow?.id]);

  useEffect(() => {
    if (credentials.length === 0) return;
    setSteps((prev) =>
      prev.map((step) => {
        if (step.stepType !== 'provider') return step;
        const provider = String(step.config.provider ?? '');
        const cred =
          credentials.find((c) => c.id === step.config.credentialId) ??
          credentials.find((c) => c.provider === provider) ??
          credentials[0];
        if (!cred) return step;
        return {
          ...step,
          config: { ...step.config, provider: cred.provider, credentialId: cred.id },
        };
      })
    );
  }, [credentials.length]);

  useEffect(() => {
    for (const { step } of providerSteps) {
      const provider = String(step.config.provider ?? '');
      if (!provider || mappingsByProvider[provider]) continue;
      setMappingsByProvider((prev) => ({
        ...prev,
        [provider]: defaultMappingsForProvider(provider),
      }));
    }
  }, [providerSteps, mappingsByProvider]);

  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      if (!moved) return prev;
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
  };

  const addStep = (type: FlowStep['stepType']) => {
    const firstCred = credentials[0];
    const config =
      type === 'condition'
        ? { field: 'email', operator: 'not_exists' }
        : type === 'provider'
          ? {
              scope: 'person',
              provider: firstCred?.provider ?? 'lusha',
              credentialId: firstCred?.id,
            }
          : type === 'delay'
            ? { seconds: 2 }
            : { url: '' };
    setSteps((s) => [...s, { stepType: type, config }]);
  };

  const updateStep = (idx: number, patch: Record<string, unknown>) => {
    setSteps((prev) => {
      const next = [...prev];
      const step = next[idx];
      if (!step) return prev;
      next[idx] = { ...step, config: { ...step.config, ...patch } };
      return next;
    });
  };

  const updateProviderMapping = (
    provider: string,
    sourceKey: string,
    patch: Partial<FieldMappingEntry>
  ) => {
    setMappingsByProvider((prev) => {
      const current = prev[provider] ?? defaultMappingsForProvider(provider);
      const row = current[sourceKey];
      if (!row) return prev;
      return {
        ...prev,
        [provider]: { ...current, [sourceKey]: { ...row, ...patch } },
      };
    });
  };

  const reorderProviderMapping = (provider: string, from: number, to: number) => {
    const rows = mappingsToRows(provider, mappingsByProvider[provider] ?? {});
    const [moved] = rows.splice(from, 1);
    if (!moved) return;
    rows.splice(to, 0, moved);
    setMappingsByProvider((prev) => ({
      ...prev,
      [provider]: rowsToMappings(rows),
    }));
  };

  const saveFlow = async () => {
    if (!token || !accountId) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const stepsPayload = steps.map((s) => {
        if (s.stepType !== 'provider') return s;
        const provider = String(s.config.provider ?? '');
        const cred =
          credentials.find((c) => c.id === s.config.credentialId) ??
          credentials.find((c) => c.provider === provider);
        return {
          ...s,
          config: {
            ...s.config,
            provider: cred?.provider ?? provider,
            credentialId: cred?.id ?? s.config.credentialId,
          },
        };
      });

      if (flows[0]?.id) {
        await api.enrichmentFlows.update(
          accountId,
          flows[0].id,
          {
            name: flowName,
            steps: stepsPayload,
            enabled: true,
            triggerOn: 'contact_created',
          },
          token
        );
      } else {
        await api.enrichmentFlows.create(
          accountId,
          { name: flowName, triggerOn: 'contact_created', steps: stepsPayload },
          token
        );
      }

      const providersInFlow = new Set(
        stepsPayload
          .filter((s) => s.stepType === 'provider')
          .map((s) => String(s.config.provider ?? ''))
          .filter(Boolean)
      );

      for (const provider of providersInFlow) {
        const cred = credentials.find((c) => c.provider === provider);
        await api.enrichmentFlows.saveMapping(
          accountId,
          {
            provider,
            credentialId: cred?.id ?? null,
            fieldMappings: mappingsByProvider[provider] ?? defaultMappingsForProvider(provider),
            provisionAttributes: true,
          },
          token
        );
      }

      setMsg('Enrichment flow and provider field mappings saved.');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Enrichment sequence</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Build a simple top-to-bottom flow: run provider 1, then provider 2, and so on.
              Typical Lead Monitor contacts arrive with <strong>name + social link</strong> — use
              this sequence to find <strong>corporate email, personal email, and mobile/WhatsApp</strong>.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setSteps(LEAD_MONITOR_RECOMMENDED_STEPS);
              setFlowName('Lead → email & phone enrichment');
            }}
          >
            Use Lead Monitor template
          </Button>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Flow name</label>
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="mt-1 max-w-md"
          />
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              {idx > 0 && (
                <div className="absolute -top-3 left-6 w-px h-3 bg-primary-300" aria-hidden />
              )}
              <div
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(idx)}
                className="border border-gray-200 rounded-xl bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/80 rounded-t-xl">
                  <span className="text-gray-400 cursor-grab active:cursor-grabbing">⋮⋮</span>
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 flex-1">
                    {STEP_LABELS[step.stepType]}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => setSteps((s) => s.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {step.stepType === 'condition' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Field</label>
                        <select
                          className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-2"
                          value={String(step.config.field ?? 'email')}
                          onChange={(e) => updateStep(idx, { field: e.target.value })}
                        >
                          <option value="email">Email</option>
                          <option value="phone">Phone / WhatsApp</option>
                          <option value="name">Name</option>
                          <option value="linkedin">LinkedIn / web link</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Operator</label>
                        <select
                          className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-2"
                          value={String(step.config.operator ?? 'exists')}
                          onChange={(e) => updateStep(idx, { operator: e.target.value })}
                        >
                          <option value="exists">exists</option>
                          <option value="not_exists">does not exist</option>
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                        </select>
                      </div>
                      {['contains', 'equals'].includes(String(step.config.operator)) && (
                        <div>
                          <label className="text-xs text-gray-500">Value</label>
                          <Input
                            className="mt-1 text-sm"
                            value={String(step.config.value ?? '')}
                            onChange={(e) => updateStep(idx, { value: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {step.stepType === 'provider' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Provider connection</label>
                          <select
                            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-2"
                            value={String(step.config.credentialId ?? '')}
                            onChange={(e) => {
                              const cred = credentials.find((c) => c.id === e.target.value);
                              updateStep(idx, {
                                credentialId: e.target.value,
                                provider: cred?.provider,
                              });
                            }}
                          >
                            {credentials.length === 0 && (
                              <option value="">Connect a provider in Connected services</option>
                            )}
                            {credentials.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label} ({c.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Lookup scope</label>
                          <select
                            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-2"
                            value={String(step.config.scope ?? 'person')}
                            onChange={(e) => updateStep(idx, { scope: e.target.value })}
                          >
                            <option value="person">Person (email / phone)</option>
                            <option value="company">Company</option>
                            <option value="auto">Auto</option>
                          </select>
                          <p className="text-[11px] text-gray-400 mt-1">
                            Use <strong>Person</strong> for Lead Monitor leads missing email/phone.
                          </p>
                        </div>
                      </div>

                      {step.config.provider ? (
                        <div>
                          <button
                            type="button"
                            className="text-sm font-medium text-primary-600 hover:text-primary-700"
                            onClick={() =>
                              setExpandedProvider(
                                expandedProvider === String(step.config.provider)
                                  ? null
                                  : String(step.config.provider)
                              )
                            }
                          >
                            {expandedProvider === String(step.config.provider) ? '▼' : '▶'} Field
                            mapping for {String(step.config.provider)}
                          </button>
                          {expandedProvider === String(step.config.provider) && (
                            <div className="mt-3">
                              <FieldMappingGrid
                                rows={mappingsToRows(
                                  String(step.config.provider),
                                  mappingsByProvider[String(step.config.provider)] ??
                                    defaultMappingsForProvider(String(step.config.provider))
                                )}
                                onChange={(sourceKey, patch) =>
                                  updateProviderMapping(String(step.config.provider), sourceKey, patch)
                                }
                                onReorder={(from, to) =>
                                  reorderProviderMapping(String(step.config.provider), from, to)
                                }
                              />
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {step.stepType === 'delay' && (
                    <div className="max-w-[160px]">
                      <label className="text-xs text-gray-500">Seconds (max 30)</label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        className="mt-1 text-sm"
                        value={Number(step.config.seconds ?? 0)}
                        onChange={(e) => updateStep(idx, { seconds: Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => addStep('provider')}>
            + Provider
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addStep('condition')}>
            + Condition
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addStep('delay')}>
            + Delay
          </Button>
        </div>

        <Button type="button" disabled={saving} onClick={() => void saveFlow()}>
          {saving ? 'Saving…' : 'Save enrichment flow'}
        </Button>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-2">
        <p className="font-medium text-gray-900">How this fits your workflow</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Lead Monitor → FlowChat:</strong> contacts often have name + post/LinkedIn URL
            only. The flow runs automatically on sync when email is missing.
          </li>
          <li>
            <strong>Manual contact in FlowChat:</strong> open a contact and click Enrich — you pick
            which fields you want (email, phone, LinkedIn, etc.) from this sequence.
          </li>
          <li>
            <strong>Name fields:</strong> map provider first/last name to CRM First name and Last
            name; full name stays on the contact record.
          </li>
        </ul>
      </div>
    </div>
  );
}
