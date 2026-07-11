import type { EnrichmentProviderId } from '@/lib/credentials/types';

export type FieldMappingEntry = {
  label: string;
  targetKey: string;
  attrType?: 'text' | 'number' | 'date' | 'boolean' | 'select';
  enabled?: boolean;
  sortOrder?: number;
};

export type ProviderFieldDef = {
  sourceKey: string;
  label: string;
  defaultTarget: string;
  attrType: FieldMappingEntry['attrType'];
  group: 'identity' | 'email' | 'phone' | 'social' | 'company';
};

/** Fields tenants typically want — used in manual enrich picker and flow defaults. */
export const CRM_GOAL_FIELDS = [
  { key: 'contact.firstName', label: 'First name', group: 'identity' as const },
  { key: 'contact.lastName', label: 'Last name', group: 'identity' as const },
  { key: 'contact.name', label: 'Full name', group: 'identity' as const },
  { key: 'contact.email', label: 'Corporate email', group: 'email' as const },
  { key: 'contact.personalEmail', label: 'Personal email', group: 'email' as const },
  { key: 'contact.phone', label: 'Mobile / WhatsApp', group: 'phone' as const },
  { key: 'person.linkedinUrl', label: 'LinkedIn profile', group: 'social' as const },
  { key: 'person.jobTitle', label: 'Job title', group: 'identity' as const },
] as const;

export type CrmGoalFieldKey = (typeof CRM_GOAL_FIELDS)[number]['key'];

const BASE_COMPANY_FIELDS: ProviderFieldDef[] = [
  { sourceKey: 'company.name', label: 'Company name', defaultTarget: 'company.name', attrType: 'text', group: 'company' },
  { sourceKey: 'company.website', label: 'Website', defaultTarget: 'company.website', attrType: 'text', group: 'company' },
  { sourceKey: 'company.industry', label: 'Industry', defaultTarget: 'company.industry', attrType: 'text', group: 'company' },
  { sourceKey: 'company.hqCity', label: 'HQ city', defaultTarget: 'company.hqCity', attrType: 'text', group: 'company' },
  { sourceKey: 'company.linkedinUrl', label: 'Company LinkedIn', defaultTarget: 'company.linkedinUrl', attrType: 'text', group: 'company' },
  { sourceKey: 'company.phone', label: 'Company phone', defaultTarget: 'company.phone', attrType: 'text', group: 'company' },
];

const BASE_PERSON_FIELDS: ProviderFieldDef[] = [
  { sourceKey: 'person.workEmail', label: 'Work email', defaultTarget: 'contact.email', attrType: 'text', group: 'email' },
  { sourceKey: 'person.personalEmail', label: 'Personal email', defaultTarget: 'contact.personalEmail', attrType: 'text', group: 'email' },
  { sourceKey: 'person.phone', label: 'Mobile / phone', defaultTarget: 'contact.phone', attrType: 'text', group: 'phone' },
  { sourceKey: 'person.jobTitle', label: 'Job title', defaultTarget: 'person.jobTitle', attrType: 'text', group: 'identity' },
  { sourceKey: 'person.linkedinUrl', label: 'LinkedIn URL', defaultTarget: 'person.linkedinUrl', attrType: 'text', group: 'social' },
  { sourceKey: 'person.firstName', label: 'First name', defaultTarget: 'contact.firstName', attrType: 'text', group: 'identity' },
  { sourceKey: 'person.lastName', label: 'Last name', defaultTarget: 'contact.lastName', attrType: 'text', group: 'identity' },
];

export const PROVIDER_FIELD_SCHEMAS: Record<EnrichmentProviderId, ProviderFieldDef[]> = {
  people_data_labs: [
    ...BASE_PERSON_FIELDS,
    ...BASE_COMPANY_FIELDS,
  ],
  lusha: [
    ...BASE_PERSON_FIELDS,
    ...BASE_COMPANY_FIELDS,
  ],
  cognism: [
    ...BASE_PERSON_FIELDS,
    ...BASE_COMPANY_FIELDS,
  ],
  companies_house: BASE_COMPANY_FIELDS,
  openmart: [...BASE_PERSON_FIELDS, ...BASE_COMPANY_FIELDS],
  explorium: [...BASE_PERSON_FIELDS, ...BASE_COMPANY_FIELDS],
};

export function getProviderFieldSchema(provider: string): ProviderFieldDef[] {
  return PROVIDER_FIELD_SCHEMAS[provider as EnrichmentProviderId] ?? BASE_PERSON_FIELDS;
}

export function defaultMappingsForProvider(provider: string): Record<string, FieldMappingEntry> {
  const schema = getProviderFieldSchema(provider);
  const out: Record<string, FieldMappingEntry> = {};
  schema.forEach((field, index) => {
    const isPriority =
      field.group === 'email' ||
      field.group === 'phone' ||
      field.sourceKey === 'person.linkedinUrl';
    out[field.sourceKey] = {
      label: field.label,
      targetKey: field.defaultTarget,
      attrType: field.attrType ?? 'text',
      enabled: isPriority,
      sortOrder: index,
    };
  });
  return out;
}

/** Map provider source keys to suggestion field keys used at runtime. */
export const SOURCE_TO_SUGGESTION_KEY: Record<string, string> = {
  'person.workEmail': 'contact.email',
  'person.personalEmail': 'contact.personalEmail',
  'person.phone': 'contact.phone',
  'person.jobTitle': 'person.jobTitle',
  'person.linkedinUrl': 'person.linkedinUrl',
  'person.firstName': 'contact.firstName',
  'person.lastName': 'contact.lastName',
  'person.companyName': 'person.companyName',
  'company.name': 'company.name',
  'company.website': 'company.website',
  'company.logoUrl': 'company.logoUrl',
  'company.hqCity': 'company.hqCity',
  'company.hqRegion': 'company.hqRegion',
  'company.hqCountry': 'company.hqCountry',
  'company.hqAddress': 'company.hqAddress',
  'company.industry': 'company.industry',
  'company.linkedinUrl': 'company.linkedinUrl',
  'company.phone': 'company.phone',
};

export function suggestionKeysFromMappings(
  fieldMappings: Record<string, FieldMappingEntry>
): string[] {
  const keys: string[] = [];
  for (const [sourceKey, mapping] of Object.entries(fieldMappings)) {
    if (mapping.enabled === false) continue;
    const suggestionKey = SOURCE_TO_SUGGESTION_KEY[sourceKey] ?? sourceKey;
    keys.push(suggestionKey);
    if (mapping.targetKey && mapping.targetKey !== suggestionKey) {
      keys.push(mapping.targetKey);
    }
  }
  return [...new Set(keys)];
}

export function goalFieldsFromFlowMappings(
  mappingsByProvider: Record<string, Record<string, FieldMappingEntry>>
): { key: string; label: string; group: string }[] {
  const seen = new Set<string>();
  const out: { key: string; label: string; group: string }[] = [];

  for (const mappings of Object.values(mappingsByProvider)) {
    for (const mapping of Object.values(mappings)) {
      if (mapping.enabled === false) continue;
      const key = mapping.targetKey;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const goal = CRM_GOAL_FIELDS.find((g) => g.key === key);
      out.push({
        key,
        label: mapping.label || goal?.label || key,
        group: goal?.group ?? 'other',
      });
    }
  }

  if (out.length === 0) {
    return CRM_GOAL_FIELDS.filter((f) =>
      ['contact.email', 'contact.personalEmail', 'contact.phone', 'person.linkedinUrl'].includes(f.key)
    ).map((f) => ({ key: f.key, label: f.label, group: f.group }));
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export const LEAD_MONITOR_RECOMMENDED_STEPS = [
  {
    stepType: 'condition' as const,
    config: { field: 'email', operator: 'not_exists' },
  },
  {
    stepType: 'provider' as const,
    config: { scope: 'person', provider: 'lusha' },
  },
  {
    stepType: 'provider' as const,
    config: { scope: 'person', provider: 'people_data_labs' },
  },
];
