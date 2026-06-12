export type CsvContactRow = {
  name: string;
  email: string | null;
  phone: string | null;
  type: 'visitor' | 'lead' | 'customer';
};

export type CsvImportError = { row: number; message: string };

const HEADERS = ['name', 'email', 'phone', 'type'] as const;

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

export function parseContactsCsv(text: string): { rows: CsvContactRow[]; errors: CsvImportError[] } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const errors: CsvImportError[] = [];
  const rows: CsvContactRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ row: 0, message: 'File is empty' }] };
  }

  const headerCells = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const hasHeader = HEADERS.some((h) => headerCells.includes(h));
  const start = hasHeader ? 1 : 0;

  if (hasHeader && !headerCells.includes('name')) {
    errors.push({ row: 1, message: 'CSV must include a name column' });
    return { rows, errors };
  }

  for (let i = start; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const rowNum = i + 1;
    let name: string;
    let email: string | null = null;
    let phone: string | null = null;
    let type: CsvContactRow['type'] = 'lead';

    if (hasHeader) {
      const map: Record<string, string> = {};
      headerCells.forEach((h, idx) => {
        map[h] = cells[idx] ?? '';
      });
      name = (map.name ?? '').trim();
      email = (map.email ?? '').trim() || null;
      phone = (map.phone ?? '').trim() || null;
      const t = (map.type ?? '').trim().toLowerCase();
      if (t === 'visitor' || t === 'lead' || t === 'customer') type = t;
    } else {
      name = (cells[0] ?? '').trim();
      email = (cells[1] ?? '').trim() || null;
      phone = (cells[2] ?? '').trim() || null;
      const t = (cells[3] ?? '').trim().toLowerCase();
      if (t === 'visitor' || t === 'lead' || t === 'customer') type = t;
    }

    if (!name) {
      errors.push({ row: rowNum, message: 'Name is required' });
      continue;
    }
    rows.push({ name, email, phone, type });
  }

  return { rows, errors };
}

export function contactsToCsv(
  contacts: {
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
    externalId?: string | null;
    labels?: string;
    customAttributes?: Record<string, unknown>;
    createdAt: string;
    lastActivityAt: string | null;
  }[],
  customAttrKeys: string[] = []
): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const headers = [
    'name',
    'email',
    'phone',
    'type',
    'external_id',
    'labels',
    ...customAttrKeys,
    'created_at',
    'last_activity_at',
  ];

  const lines = [
    headers.join(','),
    ...contacts.map((c) =>
      [
        escape(c.name),
        escape(c.email ?? ''),
        escape(c.phone ?? ''),
        c.type,
        escape(c.externalId ?? ''),
        escape(c.labels ?? ''),
        ...customAttrKeys.map((k) => escape(String(c.customAttributes?.[k] ?? ''))),
        c.createdAt,
        c.lastActivityAt ?? '',
      ].join(',')
    ),
  ];
  return lines.join('\n');
}
