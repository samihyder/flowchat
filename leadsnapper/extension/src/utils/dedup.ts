import type { Lead, PartialLead } from '../types/lead'
import { extractDomain } from './regex'

export interface DedupResult {
  isDuplicate: boolean
  existingLead?: Lead
  matchedOn?: string
}

export function checkDuplicate(incoming: PartialLead, existing: Lead[]): DedupResult {
  const inDomain = incoming.domain || (incoming.website ? extractDomain(incoming.website) : '')
  const inPhone = normalizePhone(incoming.phone)
  const inEmail = incoming.email?.toLowerCase().trim()
  const inKey = nameCity(incoming)

  for (const lead of existing) {
    const exDomain = lead.domain || (lead.website ? extractDomain(lead.website) : '')
    const exPhone = normalizePhone(lead.phone)
    const exEmail = lead.email?.toLowerCase().trim()
    const exKey = nameCity(lead)

    if (inDomain && exDomain && inDomain === exDomain) {
      return { isDuplicate: true, existingLead: lead, matchedOn: `domain: ${inDomain}` }
    }
    if (inPhone && exPhone && inPhone === exPhone) {
      return { isDuplicate: true, existingLead: lead, matchedOn: `phone: ${inPhone}` }
    }
    if (inEmail && exEmail && inEmail === exEmail) {
      return { isDuplicate: true, existingLead: lead, matchedOn: `email: ${inEmail}` }
    }
    if (inKey && exKey && inKey === exKey) {
      return { isDuplicate: true, existingLead: lead, matchedOn: `name+city: ${inKey}` }
    }
  }

  return { isDuplicate: false }
}

function normalizePhone(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '')
}

function nameCity(l: PartialLead): string {
  const name = l.businessName?.toLowerCase().trim() ?? ''
  const city = l.city?.toLowerCase().trim() ?? ''
  if (!name || !city) return ''
  return `${name}|${city}`
}
