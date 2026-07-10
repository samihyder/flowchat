'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  field_mappings: Record<string, { label: string; attrType?: string; enabled?: boolean }>;
  enabled: boolean;
};

const STEP_LABELS: Record<string, string> = {
  condition: 'Condition',
  provider: 'Enrichment provider',
  delay: 'Delay',
  webhook: 'Webhook',
};

const DEFAULT_PROVIDER_FIELDS = [
  'company.industry',
  'company.website',
  'company.hqCity',
  'company.linkedinUrl',
  'person.jobTitle',
  'person.linkedinUrl',
];

export default function EnrichmentFlowsPage() {
  const { token, accountId } = useAuthStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [credentials, setCredentials] = useState<{ id: string; provider: string; label: string }[]>(
    []
  );
  const [flowName, setFlowName] = useState('Default contact enrichment');
  const [steps, setSteps] = useState<FlowStep[]>([
    { stepType: 'condition', config: { field: 'email', operator: 'exists' } },
    { stepType: 'provider', config: { scope: 'both' } },
  ]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('people_data_labs');
  const [fieldMappings, setFieldMappings] = useState<
    Record<string, { label: string; attrType: string; enabled: boolean }>
  >({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token || !accountId) return;
    api.enrichmentFlows.list(accountId, token).then((r) => {
      setFlows(r.flows as Flow[]);
      setMappings(r.mappings as Mapping[]);
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

  useEffect(() => {
    const existing = mappings.find((m) => m.provider === selectedProvider);
    if (existing?.field_mappings && Object.keys(existing.field_mappings).length > 0) {
      setFieldMappings(
        Object.fromEntries(
          Object.entries(existing.field_mappings).map(([k, v]) => [
            k,
            {
              label: v.label,
              attrType: v.attrType ?? 'text',
              enabled: v.enabled !== false,
            },
          ])
        )
      );
      return;
    }
    const defaults: Record<string, { label: string; attrType: string; enabled: boolean }> = {};
    for (const key of DEFAULT_PROVIDER_FIELDS) {
      defaults[key] = { label: key.split('.').pop() ?? key, attrType: 'text', enabled: true };
    }
    setFieldMappings(defaults);
  }, [selectedProvider, mappings]);

  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
  };

  const addStep = (type: FlowStep['stepType']) => {
    const config =
      type === 'condition'
        ? { field: 'email', operator: 'exists' }
        : type === 'provider'
          ? { scope: 'both' }
          : type === 'delay'
            ? { seconds: 2 }
            : { url: '' };
    setSteps((s) => [...s, { stepType: type, config }]);
  };

  const saveFlow = async () => {
    if (!token || !accountId) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const cred = credentials.find((c) => c.provider === selectedProvider);
      const stepsWithCred = steps.map((s) =>
        s.stepType === 'provider' && cred
          ? { ...s, config: { ...s.config, credentialId: cred.id } }
          : s
      );
      if (flows[0]?.id) {
        await api.enrichmentFlows.update(
          accountId,
          flows[0].id,
          { name: flowName, steps: stepsWithCred, enabled: true, triggerOn: 'contact_created' },
          token
        );
      } else {
        await api.enrichmentFlows.create(
          accountId,
          { name: flowName, triggerOn: 'contact_created', steps: stepsWithCred },
          token
        );
      }
      const credId = credentials.find((c) => c.provider === selectedProvider)?.id ?? null;
      await api.enrichmentFlows.saveMapping(
        accountId,
        {
          provider: selectedProvider,
          credentialId: credId,
          fieldMappings,
          provisionAttributes: true,
        },
        token
      );
      setMsg('Enrichment flow and provider field mappings saved.');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Enrichment flow builder</h2>
          <p className="text-sm text-gray-500 mt-1">
            Drag steps to reorder. Runs automatically when a contact is created (or synced from Lead
            Monitor / WhatsApp).
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Flow name</label>
          <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} className="mt-1 max-w-md" />
        </div>

        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-grab active:cursor-grabbing"
            >
              <span className="text-gray-400 text-xs mt-1">⋮⋮</span>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-gray-800">{STEP_LABELS[step.stepType]}</p>
                {step.stepType === 'condition' && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                      value={String(step.config.field ?? 'email')}
                      onChange={(e) => {
                        const next = [...steps];
                        next[idx] = {
                          ...step,
                          config: { ...step.config, field: e.target.value },
                        };
                        setSteps(next);
                      }}
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="name">Name</option>
                    </select>
                    <select
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                      value={String(step.config.operator ?? 'exists')}
                      onChange={(e) => {
                        const next = [...steps];
                        next[idx] = {
                          ...step,
                          config: { ...step.config, operator: e.target.value },
                        };
                        setSteps(next);
                      }}
                    >
                      <option value="exists">exists</option>
                      <option value="not_exists">does not exist</option>
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                    </select>
                    {['contains', 'equals'].includes(String(step.config.operator)) && (
                      <Input
                        className="max-w-xs text-sm"
                        value={String(step.config.value ?? '')}
                        onChange={(e) => {
                          const next = [...steps];
                          next[idx] = {
                            ...step,
                            config: { ...step.config, value: e.target.value },
                          };
                          setSteps(next);
                        }}
                      />
                    )}
                  </div>
                )}
                {step.stepType === 'provider' && (
                  <select
                    className="text-sm border border-gray-200 rounded px-2 py-1"
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  >
                    {credentials.length === 0 && (
                      <option value="">Connect a provider in Connected services first</option>
                    )}
                    {credentials.map((c) => (
                      <option key={c.id} value={c.provider}>
                        {c.label} ({c.provider})
                      </option>
                    ))}
                  </select>
                )}
                {step.stepType === 'delay' && (
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    className="max-w-[120px] text-sm"
                    value={Number(step.config.seconds ?? 0)}
                    onChange={(e) => {
                      const next = [...steps];
                      next[idx] = {
                        ...step,
                        config: { ...step.config, seconds: Number(e.target.value) },
                      };
                      setSteps(next);
                    }}
                  />
                )}
              </div>
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => setSteps((s) => s.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => addStep('condition')}>
            + Condition
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addStep('provider')}>
            + Provider
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

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Provider field mapping</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose which enrichment fields are stored as custom contact attributes for this tenant.
            Saving provisions columns in the database automatically.
          </p>
        </div>

        <div className="space-y-2">
          {Object.entries(fieldMappings).map(([key, mapping]) => (
            <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mapping.enabled}
                onChange={(e) =>
                  setFieldMappings((m) => ({
                    ...m,
                    [key]: { ...mapping, enabled: e.target.checked },
                  }))
                }
              />
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{key}</code>
              <Input
                className="max-w-[180px] text-sm"
                value={mapping.label}
                onChange={(e) =>
                  setFieldMappings((m) => ({
                    ...m,
                    [key]: { ...mapping, label: e.target.value },
                  }))
                }
              />
              <select
                className="text-sm border border-gray-200 rounded px-2 py-1"
                value={mapping.attrType}
                onChange={(e) =>
                  setFieldMappings((m) => ({
                    ...m,
                    [key]: { ...mapping, attrType: e.target.value },
                  }))
                }
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
