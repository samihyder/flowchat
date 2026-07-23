/** Parsed contact from Openmart find_people task result. */
export interface OpenmartPerson {
  name: string
  title?: string
  email?: string
  mobile?: string
  linkedin?: string
  phoneConfidence?: string
  lineType?: string
}

export interface OpenmartEnrichResult {
  ownerName?: string
  ownerTitle?: string
  ownerEmail?: string
  ownerMobile?: string
  ownerLinkedin?: string
  openmartPeople: OpenmartPerson[]
  enrichedAt: string
}

interface RawOpenmartPhone {
  valid?: boolean
  line_type?: string
  phone_number?: string
  confidence_grade?: string
  phone?: string
  verified?: boolean
}

interface RawOpenmartPerson {
  email?: string | null | { email?: string }
  title?: string
  phones?: RawOpenmartPhone[]
  last_name?: string
  first_name?: string
  linkedin_url?: string
  decision_maker?: { phone?: string }
  owner_phone?: string
}

/** CH officer names are often "SURNAME, Forename Middle". */
export function parseDirectorName(name: string): { first?: string; last?: string } {
  const trimmed = name.trim()
  if (!trimmed) return {}
  if (trimmed.includes(',')) {
    const [last, rest] = trimmed.split(',').map(s => s.trim())
    const first = rest?.split(/\s+/).filter(Boolean)[0]
    return { first, last }
  }
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { first: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function rawEmail(email: RawOpenmartPerson['email']): string | undefined {
  if (!email) return undefined
  if (typeof email === 'string') return email || undefined
  return email.email || undefined
}

function pickMobile(person: RawOpenmartPerson): { number?: string; confidence?: string; lineType?: string } {
  const phones = person.phones ?? []
  const mobile = phones.find(p =>
    p.line_type?.toUpperCase() === 'MOBILE'
    || p.line_type?.toUpperCase() === 'CELL'
    || p.line_type?.toUpperCase() === 'WIRELESS',
  )
  const best = mobile ?? phones.find(p => p.phone_number || p.phone)
  const number = best?.phone_number
    || best?.phone
    || person.decision_maker?.phone
    || person.owner_phone
  if (!number) return {}
  return {
    number,
    confidence: best?.confidence_grade,
    lineType: best?.line_type,
  }
}

function personName(p: RawOpenmartPerson): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
}

function titleScore(title?: string): number {
  const t = (title ?? '').toLowerCase()
  if (/founder|co-founder|cofounder/.test(t)) return 8
  if (/\bceo\b|chief executive/.test(t)) return 7
  if (/owner|president|managing director/.test(t)) return 6
  if (/cto|coo|cfo|director/.test(t)) return 4
  return 0
}

function pickBestPerson(people: RawOpenmartPerson[]): RawOpenmartPerson | undefined {
  if (!people.length) return undefined
  const ranked = [...people].sort((a, b) => {
    const aMobile = pickMobile(a).number ? 10 : 0
    const bMobile = pickMobile(b).number ? 10 : 0
    return (bMobile + titleScore(b.title)) - (aMobile + titleScore(a.title))
  })
  return ranked[0]
}

/** Extract people array from Openmart task JSON (shape varies by API version). */
export function extractOpenmartPeople(task: unknown): RawOpenmartPerson[] {
  if (!task || typeof task !== 'object') return []
  const t = task as Record<string, unknown>

  const arrays: unknown[] = [t.data, t.result, t.output, t.people, t.contacts]
  for (const c of arrays) {
    if (Array.isArray(c) && c.length > 0) return c as RawOpenmartPerson[]
  }

  for (const key of ['data', 'result', 'output']) {
    const nested = t[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const d = nested as Record<string, unknown>
      for (const inner of ['people', 'results', 'contacts', 'data']) {
        if (Array.isArray(d[inner]) && (d[inner] as unknown[]).length > 0) {
          return d[inner] as RawOpenmartPerson[]
        }
      }
    }
  }
  return []
}

export function mapOpenmartPeople(people: RawOpenmartPerson[]): OpenmartPerson[] {
  return people.map(p => {
    const { number, confidence, lineType } = pickMobile(p)
    return {
      name: personName(p),
      title: p.title || undefined,
      email: rawEmail(p.email),
      mobile: number,
      linkedin: p.linkedin_url || undefined,
      phoneConfidence: confidence,
      lineType,
    }
  }).filter(p => p.name)
}

/** Parse find_people task payload into owner + full people list. */
export function parseOpenmartTaskResult(task: unknown): OpenmartEnrichResult {
  const raw = extractOpenmartPeople(task)
  if (!raw.length) {
    throw new Error('Openmart: no people returned for this business')
  }

  const openmartPeople = mapOpenmartPeople(raw)
  const best = pickBestPerson(raw)
  if (!best) throw new Error('Openmart: could not parse contact records')

  const name = personName(best)
  const { number } = pickMobile(best)

  return {
    ownerName: name || undefined,
    ownerTitle: best.title || undefined,
    ownerEmail: rawEmail(best.email),
    ownerMobile: number,
    ownerLinkedin: best.linkedin_url || undefined,
    openmartPeople,
    enrichedAt: new Date().toISOString(),
  }
}
