/** Derive first/last name from a combined display name (used only as a fallback —
 *  prefer real firstName/lastName input wherever it's available). */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

/** Combine first/last name into the single display name kept in sync on `contacts.name`. */
export function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}
