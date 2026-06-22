export type CsvImportError = { row: number; message: string };

export type ColumnMapping = {
  /** Full name column (used when first/last are not mapped) */
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type?: string;
  externalId?: string;
  custom?: Record<string, string>;
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

function findHeader(headers: string[], ...candidates: string[]): string | undefined {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) return headers[idx];
  }
  return undefined;
}

/** Guess column mapping from CSV headers; unmapped columns are ignored on import. */
export function guessColumnMapping(
  headers: string[],
  customAttrKeys: { key: string; label: string }[] = []
): ColumnMapping {
  const mapping: ColumnMapping = {
    firstName: findHeader(headers, 'first_name', 'firstname', 'first'),
    lastName: findHeader(headers, 'last_name', 'lastname', 'last', 'surname'),
    name: findHeader(headers, 'name', 'full_name', 'fullname', 'contact_name'),
    email: findHeader(headers, 'email', 'email_address', 'work_email'),
    phone: findHeader(headers, 'phone', 'phone_number', 'mobile', 'cell'),
    type: findHeader(headers, 'type', 'contact_type'),
    externalId: findHeader(
      headers,
      'external_id',
      'externalid',
      'record_id',
      'recordid',
      'hubspot_id',
      'crm_id'
    ),
    custom: {},
  };

  if (!mapping.firstName && !mapping.lastName && !mapping.name && headers[0]) {
    mapping.name = headers[0];
  }

  const mapped = new Set(
    [
      mapping.firstName,
      mapping.lastName,
      mapping.name,
      mapping.email,
      mapping.phone,
      mapping.type,
      mapping.externalId,
    ].filter(Boolean)
  );

  for (const attr of customAttrKeys) {
    const byKey = findHeader(headers, attr.key, normalizeHeader(attr.label));
    if (byKey && !mapped.has(byKey)) {
      mapping.custom![attr.key] = byKey;
      mapped.add(byKey);
    }
  }

  return mapping;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCsvRaw(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]!);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

export function importErrorsToCsv(errors: CsvImportError[]): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  return ['row,message', ...errors.map((e) => `${e.row},${escape(e.message)}`)].join('\n');
}
