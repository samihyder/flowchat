export type AttributeType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export type CustomAttributeDefinition = {
  id: string;
  entityType: 'contact' | 'conversation';
  key: string;
  label: string;
  attrType: AttributeType;
  options: string[] | null;
  sortOrder: number;
  required: boolean;
};

export function slugifyAttributeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

export function validateCustomAttributes(
  definitions: CustomAttributeDefinition[],
  values: Record<string, unknown> | null | undefined,
  options: { enforceRequired?: boolean } = {}
): { valid: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const valid: Record<string, unknown> = {};
  const input = values ?? {};

  for (const def of definitions) {
    const raw = input[def.key];
    if (raw === undefined || raw === null || raw === '') {
      if (options.enforceRequired && def.required) errors.push(`${def.label} is required`);
      continue;
    }

    switch (def.attrType) {
      case 'text':
        valid[def.key] = String(raw).trim();
        break;
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) errors.push(`${def.label} must be a number`);
        else valid[def.key] = n;
        break;
      }
      case 'date': {
        const d = String(raw).trim();
        if (Number.isNaN(Date.parse(d))) errors.push(`${def.label} must be a valid date`);
        else valid[def.key] = d;
        break;
      }
      case 'boolean':
        valid[def.key] = raw === true || raw === 'true' || raw === '1' || raw === 1;
        break;
      case 'select': {
        const v = String(raw).trim();
        const opts = def.options ?? [];
        if (opts.length > 0 && !opts.includes(v)) {
          errors.push(`${def.label} must be one of: ${opts.join(', ')}`);
        } else {
          valid[def.key] = v;
        }
        break;
      }
    }
  }

  for (const key of Object.keys(input)) {
    if (!definitions.some((d) => d.key === key)) {
      valid[key] = input[key];
    }
  }

  return { valid, errors };
}

export function serializeDefinitionRow(row: Record<string, unknown>): CustomAttributeDefinition {
  const options = row.options as string[] | null;
  return {
    id: row.id as string,
    entityType: row.entityType as 'contact' | 'conversation',
    key: row.key as string,
    label: row.label as string,
    attrType: row.attrType as AttributeType,
    options: Array.isArray(options) ? options : null,
    sortOrder: Number(row.sortOrder ?? 0),
    required: Boolean(row.required),
  };
}
