import type { PartialLead, LeadPriority } from '../types/lead'

export interface ScoreResult {
  score: number
  priority: LeadPriority
  signals: string[]
}

interface ScoringSignal {
  label: string
  points: number
  check: (lead: PartialLead) => boolean
}

const SIGNALS: ScoringSignal[] = [
  { label: 'Has phone number',             points: 10, check: l => !!(l.phone || l.ownerMobile) },
  { label: 'Has business email',           points: 10, check: l => !!(l.email || l.primaryEmail) },
  { label: 'Has website',                  points: 10, check: l => !!(l.website || l.hasWebsite) },
  { label: 'Has LinkedIn',                 points: 10, check: l => !!(l.linkedinUrl || l.decisionMakerLinkedin) },
  { label: 'Has WhatsApp',                 points:  5, check: l => l.hasWhatsApp === true || !!l.whatsappUrl },
  { label: 'No chat widget detected',      points: 10, check: l => l.hasChatWidget === false },
  { label: 'No booking system',            points: 10, check: l => l.hasBookingSystem === false },
  { label: 'No online ordering',           points: 15, check: l => l.hasOnlineOrdering === false && isRestaurant(l) },
  { label: 'Google reviews > 50',          points:  5, check: l => (l.googleReviews ?? 0) > 50 },
  { label: 'Google reviews > 100',         points:  5, check: l => (l.googleReviews ?? 0) > 100 },
  { label: 'Google rating ≥ 4.0',          points:  5, check: l => typeof l.googleRating === 'number' && l.googleRating >= 4.0 },
  { label: 'Google rating < 4.0',          points:  5, check: l => typeof l.googleRating === 'number' && l.googleRating < 4.0 },
  { label: 'Has Instagram or Facebook',    points:  5, check: l => !!(l.instagramUrl || l.facebookUrl) },
  { label: 'Found on business listings',   points:  5, check: l => (l.businessListings?.length ?? 0) > 0 },
  { label: 'Mentions company registration',points:  5, check: l => l.mentionsCompanyReg === true || !!l.companyNumberFound },
  { label: 'Restaurant / takeaway',        points: 20, check: l => isRestaurant(l) },
  { label: 'E-commerce website',           points: 20, check: l => isEcommerce(l) },
  { label: 'Construction / infrastructure',points: 25, check: l => isConstruction(l) },
  { label: 'Cybersecurity-relevant sector',points: 20, check: l => isCybersecuritySector(l) },
  { label: 'Oracle / Unifier keyword',     points: 40, check: l => isOracleKeyword(l) },
  { label: 'Owner / director name found',  points: 10, check: l => !!(l.ownerName || l.directorName) },
  { label: 'City matched',                 points:  5, check: l => !!l.city },
]

function isRestaurant(l: PartialLead): boolean {
  const haystack = [l.industry, l.category, l.businessName, l.notes].join(' ').toLowerCase()
  return /restaurant|takeaway|café|cafe|bistro|diner|takeout|food|pizza|curry|kebab|sushi/.test(haystack)
}

function isEcommerce(l: PartialLead): boolean {
  const haystack = [l.industry, l.category, l.technologyDetected?.join(' ')].join(' ').toLowerCase()
  return /shopify|woocommerce|ecommerce|e-commerce|online store|magento/.test(haystack)
}

function isConstruction(l: PartialLead): boolean {
  const haystack = [l.industry, l.category, l.businessName].join(' ').toLowerCase()
  return /construction|infrastructure|civil engineer|project controls|contractor|builder|property developer/.test(haystack)
}

function isCybersecuritySector(l: PartialLead): boolean {
  const haystack = [l.industry, l.category, l.serviceFit?.join(' ')].join(' ').toLowerCase()
  return /saas|fintech|healthtech|healthcare|finance|bank|insurance|gov|nhs|cybersecurity/.test(haystack)
}

function isOracleKeyword(l: PartialLead): boolean {
  const haystack = [l.businessName, l.category, l.industry, l.notes, l.website].join(' ').toLowerCase()
  return /oracle|unifier|primavera|p6/.test(haystack)
}

export function scoreLead(lead: PartialLead): ScoreResult {
  const fired: string[] = []
  let total = 0

  for (const signal of SIGNALS) {
    if (signal.check(lead)) {
      total += signal.points
      fired.push(`${signal.label} (+${signal.points})`)
    }
  }

  const capped = Math.min(total, 100)
  const priority: LeadPriority = capped >= 70 ? 'Hot' : capped >= 40 ? 'Warm' : 'Cold'

  return { score: capped, priority, signals: fired }
}
