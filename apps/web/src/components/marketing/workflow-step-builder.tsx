'use client';

import { Button } from '@/components/ui/button';

export type WorkflowStepDraft = {
  stepType: string;
  config: Record<string, unknown>;
};

const STEP_LABELS: Record<string, string> = {
  send_email: 'Send email',
  wait: 'Wait',
  branch: 'Branch',
  add_label: 'Add label',
  exit: 'Exit',
};

export function WorkflowStepBuilder({
  steps,
  onChange,
  templates,
}: {
  steps: WorkflowStepDraft[];
  onChange: (steps: WorkflowStepDraft[]) => void;
  templates: { id: string; name: string }[];
}) {
  const addStep = (type: string) => {
    const config: Record<string, unknown> = {};
    if (type === 'send_email') config.templateId = templates[0]?.id ?? '';
    if (type === 'wait') config.hours = 24;
    if (type === 'branch') {
      config.condition = 'not_opened';
      config.waitHours = 48;
      config.trueStepOrder = steps.length + 2;
      config.falseStepOrder = steps.length + 3;
    }
    onChange([...steps, { stepType: type, config }]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...steps];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    const swap = next[target];
    if (!tmp || !swap) return;
    next[index] = swap;
    next[target] = tmp;
    onChange(next);
  };

  const remove = (index: number) => onChange(steps.filter((_, i) => i !== index));

  const updateConfig = (index: number, key: string, value: unknown) => {
    const next = [...steps];
    const step = next[index];
    if (!step) return;
    next[index] = { ...step, config: { ...step.config, [key]: value } };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex justify-between items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {i + 1}. {STEP_LABELS[step.stepType] ?? step.stepType}
              </span>
              <div className="flex gap-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => move(i, -1)}>↑</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => move(i, 1)}>↓</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => remove(i)}>×</Button>
              </div>
            </div>
            {step.stepType === 'send_email' && (
              <select
                value={String(step.config.templateId ?? '')}
                onChange={(e) => updateConfig(i, 'templateId', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            {step.stepType === 'wait' && (
              <input
                type="number"
                min={1}
                value={Number(step.config.hours ?? 24)}
                onChange={(e) => updateConfig(i, 'hours', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                placeholder="Hours"
              />
            )}
            {step.stepType === 'branch' && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={String(step.config.condition ?? 'not_opened')}
                  onChange={(e) => updateConfig(i, 'condition', e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-200 rounded"
                >
                  <option value="opened">If opened</option>
                  <option value="not_opened">If not opened</option>
                  <option value="clicked">If clicked</option>
                </select>
                <input
                  type="number"
                  value={Number(step.config.waitHours ?? 48)}
                  onChange={(e) => updateConfig(i, 'waitHours', Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-200 rounded"
                  placeholder="Wait hours"
                />
              </div>
            )}
          </li>
        ))}
        {steps.length === 0 && <p className="text-sm text-gray-400">Add steps below.</p>}
      </ul>
      <div className="flex flex-wrap gap-2">
        {Object.keys(STEP_LABELS).map((type) => (
          <Button key={type} type="button" variant="secondary" size="sm" onClick={() => addStep(type)}>
            + {STEP_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}
