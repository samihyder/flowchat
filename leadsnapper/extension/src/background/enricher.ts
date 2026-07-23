import type { EnrichedData, ScanLead } from '../types/scan'

// Self-contained extraction function injected into background tabs.
// MUST NOT reference any external imports — it is serialized as a string.
function extractWebsiteDataFn(): EnrichedData {
  const body  = document.body?.innerText ?? ''
  const html  = document.documentElement?.innerHTML ?? ''
  const hrefs = [...document.querySelectorAll('a[href]')].map(a => (a as HTMLAnchorElement).href)

  // ── Emails ──────────────────────────────────────────────────────────────────
  const emailRe  = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g
  const blocked  = ['example.com','test.com','domain.com','yourdomain','yoursite','sentry','wixpress','cloudflare','w3.org','schema.org']
  const emails   = [...new Set((body.match(emailRe) ?? []).filter((e: string) => !blocked.some((b: string) => e.includes(b))))]

  // ── Phones ──────────────────────────────────────────────────────────────────
  const phoneRe   = /(\+44[\s\d\-()\+]{8,14}|0[12378]\d[\s\d\-()\+]{7,11}|\+1[\s\d\-()\+]{9,13}|\(\d{3}\)[\s\-]\d{3}\-\d{4})/g
  const rawPhones = body.match(phoneRe) ?? []
  const phones    = [...new Set(rawPhones.map((p: string) => p.trim()))]

  // ── Schema.org ──────────────────────────────────────────────────────────────
  let schemaPhone = '', schemaEmail = '', schemaAddress = '', schemaCity = ''
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const d = JSON.parse(s.textContent ?? '') as Record<string, unknown>
      const items = Array.isArray(d) ? d as Record<string, unknown>[] : [d]
      for (const item of items) {
        if (/LocalBusiness|Restaurant|Organization|Store|FoodEstablishment/.test(String(item['@type'] ?? ''))) {
          schemaPhone   = item.telephone ? String(item.telephone) : ''
          schemaEmail   = item.email     ? String(item.email)     : ''
          const addr    = item.address as Record<string, string> | undefined
          schemaAddress = addr?.streetAddress   ?? ''
          schemaCity    = addr?.addressLocality ?? ''
          break
        }
      }
    } catch { /* ignore */ }
  }

  // ── Social links ────────────────────────────────────────────────────────────
  const social = {
    linkedinCompany: hrefs.find((h: string) => /linkedin\.com\/company\//i.test(h)),
    linkedinPerson:  hrefs.find((h: string) => /linkedin\.com\/in\//i.test(h)),
    facebook:        hrefs.find((h: string) => /facebook\.com\/(?!sharer|share|l\.php)/i.test(h)),
    instagram:       hrefs.find((h: string) => /instagram\.com\/[a-zA-Z0-9]/i.test(h)),
    tiktok:          hrefs.find((h: string) => /tiktok\.com\/@/i.test(h)),
    youtube:         hrefs.find((h: string) => /youtube\.com\/(channel|c|@|user)/i.test(h)),
    xTwitter:        hrefs.find((h: string) => /(twitter|x)\.com\/[a-zA-Z0-9_]/i.test(h)),
    whatsapp:        hrefs.find((h: string) => /wa\.me\/|whatsapp\.com\/send|whatsapp:\/\//i.test(h)),
  }
  const socialCount = Object.values(social).filter(Boolean).length
  const socialScore = Math.min(socialCount * 15, 100)

  // ── WhatsApp (dedicated — covers inline tel: links too) ─────────────────────
  const whatsappUrl = social.whatsapp
    ?? hrefs.find((h: string) => /whatsapp/i.test(h))
    ?? (html.match(/https?:\/\/wa\.me\/[\d+%]+/)?.[0])
    ?? undefined
  const hasWhatsApp = !!whatsappUrl || /whatsapp/i.test(html)

  // ── Tech stack ──────────────────────────────────────────────────────────────
  const techStack: string[] = []
  if (/wp-content|wp-json|wordpress/i.test(html))          techStack.push('WordPress')
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(html))      techStack.push('Shopify')
  if (/woocommerce|wc-ajax/i.test(html))                   techStack.push('WooCommerce')
  if (/wix\.com|wixsite/i.test(html))                      techStack.push('Wix')
  if (/webflow\.io|data-wf-site/i.test(html))              techStack.push('Webflow')
  if (/__NEXT_DATA__|_next\/static/i.test(html))            techStack.push('Next.js')
  if (/squarespace|static1\.squarespace/i.test(html))      techStack.push('Squarespace')
  if (/Mage\.Cookies|\/skin\/frontend/i.test(html))        techStack.push('Magento')
  if (/angular/i.test(html))                               techStack.push('Angular')
  if (/vue\.js|vuejs|__vue__/i.test(html))                 techStack.push('Vue.js')
  if (/react(?!ive)|__react/i.test(html) && !techStack.includes('Next.js') && !techStack.includes('WordPress')) techStack.push('React')
  if (/hubspot/i.test(html))                               techStack.push('HubSpot')
  if (/salesforce|force\.com/i.test(html))                 techStack.push('Salesforce')

  // ── Chat widget (identify provider) ─────────────────────────────────────────
  let chatWidgetProvider = ''
  if      (/intercom/i.test(html))               chatWidgetProvider = 'Intercom'
  else if (/tawk\.to/i.test(html))               chatWidgetProvider = 'Tawk.to'
  else if (/tidio/i.test(html))                  chatWidgetProvider = 'Tidio'
  else if (/livechat/i.test(html))               chatWidgetProvider = 'LiveChat'
  else if (/zendesk/i.test(html))                chatWidgetProvider = 'Zendesk'
  else if (/drift/i.test(html))                  chatWidgetProvider = 'Drift'
  else if (/crisp/i.test(html))                  chatWidgetProvider = 'Crisp'
  else if (/freshchat|freshdesk/i.test(html))    chatWidgetProvider = 'Freshdesk'
  else if (/hubspot.*chat|_hsp/i.test(html))     chatWidgetProvider = 'HubSpot Chat'
  else if (/olark/i.test(html))                  chatWidgetProvider = 'Olark'
  else if (/smartsupp/i.test(html))              chatWidgetProvider = 'Smartsupp'
  else if (/purechat/i.test(html))               chatWidgetProvider = 'Pure Chat'
  else if (/chatra/i.test(html))                 chatWidgetProvider = 'Chatra'
  const hasChatWidget = !!chatWidgetProvider

  // ── Contact form ────────────────────────────────────────────────────────────
  const hasContactForm = !!(
    document.querySelector('form input[type="email"]') ||
    document.querySelector('form input[name*="email"]') ||
    document.querySelector('form input[name*="contact"]') ||
    document.querySelector('form[action*="contact"]') ||
    document.querySelector('form[id*="contact"]') ||
    document.querySelector('form[class*="contact"]')
  )

  // ── Order / checkout ────────────────────────────────────────────────────────
  const hasOnlineOrdering = /order\s+online|add\s+to\s+cart|buy\s+now|checkout|ubereats|deliveroo|just\s+eat|doordash|order\s+now|order\s+here/i.test(html + body)
  const orderPageUrl      = hrefs.find((h: string) => /\/order|\/checkout|\/cart|\/buy|\/purchase|\/menu\/order|\/online-order/i.test(h)) ?? undefined

  // ── Booking system ──────────────────────────────────────────────────────────
  const hasBookingSystem = /book\s+now|book\s+a\s+table|reservation|make\s+a\s+booking|calendly|booksy|opentable|fresha|treatwell|resy|openTable/i.test(html + body)
  const bookingUrl       = hrefs.find((h: string) => /\/book|\/reservation|\/appointment|\/booking|calendly|booksy|opentable|fresha/i.test(h)) ?? undefined

  // ── Business listings ────────────────────────────────────────────────────────
  const listingPatterns: [string, RegExp][] = [
    ['Yelp',          /yelp\.com/i],
    ['TripAdvisor',   /tripadvisor\.(com|co\.uk)/i],
    ['Trustpilot',    /trustpilot\.com/i],
    ['Google Business', /business\.google\.com/i],
    ['Yell',          /yell\.com/i],
    ['Checkatrade',   /checkatrade\.com/i],
    ['Rated People',  /ratedpeople\.com/i],
    ['Bark',          /bark\.com/i],
    ['Houzz',         /houzz\.(com|co\.uk)/i],
    ['Clutch',        /clutch\.co/i],
    ['G2',            /g2\.com\/products/i],
    ['Foursquare',    /foursquare\.com/i],
    ['Thomson Local', /thomsonlocal\.com/i],
    ['FreeIndex',     /freeindex\.co\.uk/i],
    ['Cylex',         /cylex\.(co\.uk|com)/i],
  ]
  const businessListings: string[] = []
  const listingUrls: Record<string, string> = {}
  for (const href of hrefs) {
    for (const [name, re] of listingPatterns) {
      if (!listingUrls[name] && re.test(href)) {
        businessListings.push(name)
        listingUrls[name] = href
      }
    }
  }

  // ── Company / legal signals ──────────────────────────────────────────────────
  const mentionsCompanyReg  = /company\s+(?:number|no\.?|reg\.?)|registered\s+in\s+england|companies\s+house|company\s+reg/i.test(body)
  const companyNoMatch      = body.match(/company\s+(?:number|no\.?|reg\.?(?:istration)?)[:\s#]*([0-9]{6,8})/i)
  const companyNumberFound  = companyNoMatch?.[1] ?? undefined
  const mentionsTrademark   = /\btrademark\b|trade\s*mark|®|™|registered\s+trade/i.test(body)
  const mentionsDuns        = /\bduns\b|d-u-n-s|dun\s*&\s*bradstreet|d&b\s+number/i.test(body)

  // ── Other signals ────────────────────────────────────────────────────────────
  const hasNewsletter   = /subscribe|newsletter|mailing\s*list/i.test(html + body)
  const hasCareersPage  = !!hrefs.find((h: string) => /\/careers|\/jobs|\/vacancies|\/work-with-us/i.test(h))
  const hasPrivacyPolicy = !!hrefs.find((h: string) => /privacy/i.test(h))

  // ── Page meta ────────────────────────────────────────────────────────────────
  const metaTitle       = document.title?.trim() ?? ''
  const metaEl          = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
  const metaDescription = metaEl?.content?.trim() ?? ''
  const aboutPageUrl    = hrefs.find((h: string) => /\/about|about-us|who-we-are/i.test(h)) ?? undefined
  const contactPageUrl  = hrefs.find((h: string) => /\/contact|get-in-touch/i.test(h)) ?? undefined
  const careersPageUrl  = hrefs.find((h: string) => /\/careers|\/jobs|\/vacancies/i.test(h)) ?? undefined

  const allPhones = [...new Set([...phones, ...(schemaPhone ? [schemaPhone] : [])])]
  const allEmails = [...new Set([...emails, ...(schemaEmail ? [schemaEmail] : [])])]

  // ── Owner / founder / director detection ────────────────────────────────────
  let ownerName  = ''
  let ownerTitle = ''
  let ownerPhone = ''

  // 1. Schema.org Person or Employee markup (most reliable)
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const d = JSON.parse(s.textContent ?? '') as Record<string, unknown>
      const items = Array.isArray(d) ? d as Record<string, unknown>[] : [d]
      for (const item of items) {
        const t = String(item['@type'] ?? '')
        if (/^(Person|Employee|OrganizationRole)$/.test(t)) {
          ownerName  = ownerName  || String(item.name ?? item.givenName ?? '')
          ownerTitle = ownerTitle || String(item.jobTitle ?? item.roleName ?? '')
          ownerPhone = ownerPhone || String(item.telephone ?? '')
        }
      }
    } catch { /* ignore */ }
  }

  // 2. Text pattern matching — "Keyword: Name" or "Name, keyword"
  if (!ownerName) {
    const kwPat = /(?:owner|founder|co-?founder|proprietor|ceo|managing director|md\b|chairman|director|principal)/i
    const nmPat = /[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2}/
    const lines = body.split(/\n+/).filter((l: string) => l.length < 300)
    for (const line of lines) {
      if (!kwPat.test(line)) continue
      // "owned by John Smith" or "John Smith, Owner" or "Founder: Jane Doe"
      const fwd = line.match(new RegExp(`(?:${kwPat.source})[:\\s,–-]+` + nmPat.source, 'i'))
      const rev = line.match(new RegExp(nmPat.source + `[,\\s–-]+(?:${kwPat.source})`, 'i'))
      const m   = fwd ?? rev
      if (m) {
        const nameHit = m[0].match(nmPat)
        if (nameHit) {
          ownerName  = nameHit[0]
          const kw   = m[0].match(kwPat)
          ownerTitle = kw ? kw[0].replace(/\b\w/g, c => c.toUpperCase()) : ''
          break
        }
      }
    }
  }

  // 3. Owner LinkedIn — person profile (/in/), distinct from company page
  const ownerLinkedinUrl = hrefs.find((h: string) => /linkedin\.com\/in\//.test(h)) ?? ''

  // 4. Structured team section (class-based)
  const teamMembers: Array<{name: string; title?: string; linkedinUrl?: string}> = []
  const teamContainers = [...document.querySelectorAll(
    '[class*="team" i], [class*="staff" i], [class*="people" i], [id*="team" i], [id*="about" i]'
  )]
  for (const container of teamContainers.slice(0, 2)) {
    const memberEls = container.querySelectorAll('article, [class*="member" i], [class*="person" i], li')
    for (const el of Array.from(memberEls).slice(0, 6)) {
      const nameEl = el.querySelector('h3, h4, h5, [class*="name" i]') as HTMLElement | null
      const name   = nameEl?.innerText?.trim()
      if (!name || !/^[A-Z][a-z]+ [A-Z][a-z]+/.test(name)) continue
      const titleEl  = el.querySelector('[class*="title" i], [class*="role" i], [class*="position" i], p') as HTMLElement | null
      const linkedEl = el.querySelector('a[href*="linkedin.com/in/"]') as HTMLAnchorElement | null
      teamMembers.push({
        name,
        title:      titleEl?.innerText?.trim() ?? undefined,
        linkedinUrl: linkedEl?.href ?? undefined,
      })
      // If no owner yet, use first team member with an owner-like title
      if (!ownerName && titleEl) {
        const t = titleEl.innerText?.toLowerCase() ?? ''
        if (/owner|founder|director|ceo|md\b|managing/.test(t)) {
          ownerName  = name
          ownerTitle = titleEl.innerText.trim()
          ownerLinkedinUrl || (linkedEl?.href ?? '')
        }
      }
    }
    if (teamMembers.length > 0) break
  }

  return {
    emails: allEmails,
    phones: allPhones,
    primaryEmail:   allEmails[0],
    primaryPhone:   allPhones[0],
    ownerName:      ownerName      || undefined,
    ownerTitle:     ownerTitle     || undefined,
    ownerPhone:     ownerPhone     || undefined,
    ownerLinkedinUrl: ownerLinkedinUrl || undefined,
    teamMembers,
    hasWhatsApp,
    whatsappUrl,
    social,
    socialPresenceScore: socialScore,
    techStack,
    hasChatWidget,
    chatWidgetProvider: chatWidgetProvider || undefined,
    hasContactForm,
    hasOnlineOrdering,
    orderPageUrl,
    hasBookingSystem,
    bookingUrl,
    hasNewsletter,
    hasCareersPage,
    hasPrivacyPolicy,
    businessListings,
    listingUrls,
    mentionsCompanyReg,
    companyNumberFound,
    mentionsTrademark,
    mentionsDuns,
    securitySignal: location.protocol === 'https:' ? 'HTTPS' : 'HTTP only',
    metaTitle,
    metaDescription,
    schemaEmail,
    schemaAddress,
    schemaCity,
    aboutPageUrl,
    contactPageUrl,
    careersPageUrl,
    enrichedAt: new Date().toISOString(),
  }
}

// ── Google Maps place page extraction (injected into Maps tabs) ───────────────
// MUST be self-contained — no external imports.
function extractMapsPlaceFn(): {
  websiteUrl: string; phone: string; address: string; city: string
  category: string; openingHours: string; description: string
  rating: number | null; reviews: number | null
} {
  // Website — look for the "Visit website" link
  let websiteUrl = ''
  const anchors = [...document.querySelectorAll('a[href]')] as HTMLAnchorElement[]
  for (const a of anchors) {
    const label = (a.getAttribute('aria-label') ?? a.getAttribute('data-tooltip') ?? '').toLowerCase()
    const href  = a.href ?? ''
    if (label.includes('website') || label.includes('web site')) {
      if (href.startsWith('http') && !href.includes('google.com')) { websiteUrl = href; break }
    }
  }
  // Fallback: data-item-id authority link
  if (!websiteUrl) {
    const authEl = document.querySelector('[data-item-id*="authority"] a, a[data-item-id*="authority"]') as HTMLAnchorElement | null
    if (authEl?.href && !authEl.href.includes('google.com')) websiteUrl = authEl.href
  }

  // Phone
  const phoneEl = document.querySelector('[data-item-id*="phone"] .Io6YTe, [data-item-id*="phone"] span')
  const phone   = phoneEl?.textContent?.trim() ?? ''

  // Address
  const addrEl  = document.querySelector('[data-item-id="address"] .Io6YTe, button[data-item-id="address"] .rogA2c')
  const address = addrEl?.textContent?.trim() ?? ''
  const cityMatch = address.match(/,\s*([^,\d]+?)(?:,\s*[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}|$)/)
  const city    = cityMatch?.[1]?.trim() ?? ''

  // Category
  const catEl   = document.querySelector('button.DkEaL, [jsaction*="category"] span, .DkEaL')
  const category = catEl?.textContent?.trim() ?? ''

  // Rating
  const ratingEl = document.querySelector('span.ceNzKf, div.F7nice span[aria-hidden="true"]')
  const ratingVal = parseFloat(ratingEl?.textContent?.trim() ?? '')
  const rating   = isNaN(ratingVal) ? null : ratingVal

  // Reviews
  const reviewAttr = document.querySelector('[aria-label*="review" i], .F7nice span[aria-label]')?.getAttribute('aria-label') ?? ''
  const rvMatch    = reviewAttr.match(/([\d,]+)/)
  const reviews    = rvMatch ? parseInt(rvMatch[1].replace(/,/g, '')) : null

  // Opening hours
  const hoursEl   = document.querySelector('.t39EBf, .WkFjNe span, [jsaction*="openhours"] .ZDu9vd')
  const openingHours = hoursEl?.textContent?.trim() ?? ''

  // Description / about
  const descEl    = document.querySelector('.PYvSYb, .WgsUrc, .HlvSq')
  const description = descEl?.textContent?.trim() ?? ''

  return { websiteUrl, phone, address, city, category, openingHours, description, rating, reviews }
}

// ── Enrichment queue ──────────────────────────────────────────────────────────

const MAX_CONCURRENT = 3
const queue: Array<{
  lead: ScanLead
  onResult: (id: string, result: EnrichedData | null, error?: string) => void
}> = []
let running = 0

export function enqueueEnrichment(
  lead: ScanLead,
  onResult: (id: string, result: EnrichedData | null, error?: string) => void
): void {
  // Decide which URL to start enrichment from
  const hasWebsite  = !!lead.websiteUrl
  const hasMapsUrl  = !!lead.googleMapsUrl
  const hasSrcUrl   = !!lead.sourceUrl?.startsWith('http')

  if (!hasWebsite && !hasMapsUrl && !hasSrcUrl) {
    onResult(lead.id, null, 'No URL available')
    return
  }

  queue.push({ lead, onResult })
  drainQueue()
}

function drainQueue() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!
    running++
    enrichOne(job.lead)
      .then(data  => job.onResult(job.lead.id, data))
      .catch(err  => job.onResult(job.lead.id, null, String(err)))
      .finally(() => { running--; drainQueue() })
  }
}

async function enrichOne(lead: ScanLead): Promise<EnrichedData | null> {
  // For Google Maps leads: visit the Maps place page first to get
  // website URL + full GMB data, then enrich the actual website.
  if (lead.sourceType === 'Google Maps' && lead.googleMapsUrl) {
    return enrichMapsLead(lead)
  }
  // For Google Search leads: websiteUrl is already the business website.
  const url = lead.websiteUrl ?? lead.sourceUrl
  if (!url?.startsWith('http')) return null
  return enrichWebsite(url)
}

async function enrichMapsLead(lead: ScanLead): Promise<EnrichedData | null> {
  // Step 1 — visit the Google Maps place page to get GMB data + website URL
  const gmb = await visitAndRun(lead.googleMapsUrl!, extractMapsPlaceFn, 15000)
  const gmbData = gmb ?? { websiteUrl: '', phone: '', address: '', city: '', category: '', openingHours: '', description: '', rating: null, reviews: null }

  // Step 2 — determine website URL (from GMB or from lead)
  const websiteUrl = gmbData.websiteUrl || lead.websiteUrl || ''

  // Step 3 — enrich the actual website if we have a URL
  const webData = websiteUrl.startsWith('http') ? await enrichWebsite(websiteUrl) : null

  // Step 4 — merge: website data is primary, GMB fills in blanks
  const base = webData ?? emptyEnrichedData()
  return {
    ...base,
    // Override with GMB contact if website didn't find it
    primaryPhone:    base.primaryPhone || gmbData.phone || undefined,
    phones:          base.phones.length ? base.phones : (gmbData.phone ? [gmbData.phone] : []),
    // GMB fields
    gmbWebsiteUrl:   gmbData.websiteUrl || undefined,
    gmbPhone:        gmbData.phone      || undefined,
    gmbAddress:      gmbData.address    || undefined,
    gmbCity:         gmbData.city       || undefined,
    gmbCategory:     gmbData.category   || undefined,
    gmbOpeningHours: gmbData.openingHours || undefined,
    gmbDescription:  gmbData.description  || undefined,
    gmbRating:       gmbData.rating  ?? undefined,
    gmbReviews:      gmbData.reviews ?? undefined,
    enrichedAt: new Date().toISOString(),
  }
}

// Self-contained about/team page extraction — injected into about page tabs.
// MUST NOT reference external imports.
function extractAboutPageFn(): {
  ownerName: string; ownerTitle: string; ownerLinkedinUrl: string; ownerPhone: string
  teamMembers: Array<{ name: string; title?: string; linkedinUrl?: string }>
} {
  const body  = document.body?.innerText ?? ''
  const hrefs = [...document.querySelectorAll('a[href]')].map(a => (a as HTMLAnchorElement).href)
  let ownerName = '', ownerTitle = '', ownerPhone = ''

  // Schema.org Person
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const d = JSON.parse(s.textContent ?? '') as Record<string, unknown>
      const items = Array.isArray(d) ? d as Record<string, unknown>[] : [d]
      for (const item of items) {
        if (/^(Person|Employee)$/.test(String(item['@type'] ?? ''))) {
          ownerName  = ownerName  || String(item.name ?? '')
          ownerTitle = ownerTitle || String(item.jobTitle ?? '')
          ownerPhone = ownerPhone || String(item.telephone ?? '')
        }
      }
    } catch {}
  }

  // Text patterns
  if (!ownerName) {
    const kwPat = /(?:owner|founder|co-?founder|proprietor|ceo|managing director|md\b|director|chairman|principal)/i
    const nmPat = /[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2}/
    for (const line of body.split(/\n+/).filter((l: string) => l.length < 300)) {
      if (!kwPat.test(line)) continue
      const fwd = line.match(new RegExp(`(?:${kwPat.source})[:\\s,–-]+` + nmPat.source, 'i'))
      const rev = line.match(new RegExp(nmPat.source + `[,\\s–-]+(?:${kwPat.source})`, 'i'))
      const hit = (fwd ?? rev)?.[0]?.match(nmPat)
      if (hit) {
        ownerName  = hit[0]
        const kw   = (fwd ?? rev)?.[0]?.match(kwPat)
        ownerTitle = kw ? kw[0].replace(/\b\w/g, (c: string) => c.toUpperCase()) : ''
        break
      }
    }
  }

  // Team members from structured HTML
  const teamMembers: Array<{ name: string; title?: string; linkedinUrl?: string }> = []
  const containers = [...document.querySelectorAll(
    '[class*="team" i], [class*="staff" i], [class*="people" i], [class*="member" i], [id*="team" i]'
  )]
  for (const container of containers.slice(0, 3)) {
    const els = container.querySelectorAll('article, li, [class*="person" i], [class*="card" i], div')
    for (const el of Array.from(els).slice(0, 8)) {
      const nameEl  = el.querySelector('h2, h3, h4, h5, [class*="name" i]') as HTMLElement | null
      const name    = nameEl?.innerText?.trim()
      if (!name || !/^[A-Z][a-z]+ [A-Z][a-z]+/.test(name) || name.length > 60) continue
      const titleEl = el.querySelector('[class*="title" i], [class*="role" i], [class*="position" i], p') as HTMLElement | null
      const liEl    = el.querySelector('a[href*="linkedin.com/in/"]') as HTMLAnchorElement | null
      teamMembers.push({ name, title: titleEl?.innerText?.trim() || undefined, linkedinUrl: liEl?.href || undefined })
      if (!ownerName && titleEl) {
        const t = titleEl.innerText?.toLowerCase() ?? ''
        if (/owner|founder|director|ceo|md\b|managing/.test(t)) {
          ownerName = name; ownerTitle = titleEl.innerText.trim()
        }
      }
    }
    if (teamMembers.length >= 3) break
  }

  const ownerLinkedinUrl = hrefs.find((h: string) => /linkedin\.com\/in\//.test(h)) ?? ''
  return { ownerName, ownerTitle, ownerLinkedinUrl, ownerPhone, teamMembers }
}

async function enrichWebsite(url: string): Promise<EnrichedData | null> {
  const webData = await visitAndRun(url, extractWebsiteDataFn, 12000)
  if (!webData) return null

  // If no owner found from main page AND an about page was detected, visit it
  if (!webData.ownerName && webData.aboutPageUrl) {
    const aboutData = await visitAndRun(webData.aboutPageUrl, extractAboutPageFn, 10000)
    if (aboutData?.ownerName) {
      return {
        ...webData,
        ownerName:        aboutData.ownerName        || webData.ownerName,
        ownerTitle:       aboutData.ownerTitle       || webData.ownerTitle,
        ownerLinkedinUrl: aboutData.ownerLinkedinUrl || webData.ownerLinkedinUrl,
        ownerPhone:       aboutData.ownerPhone       || webData.ownerPhone,
        teamMembers:      aboutData.teamMembers?.length ? aboutData.teamMembers : webData.teamMembers,
      }
    }
  }

  return webData
}

async function visitAndRun<T>(url: string, fn: () => T, timeoutMs: number): Promise<T | null> {
  let tabId: number | undefined
  try {
    const tab = await chrome.tabs.create({ url, active: false, pinned: false })
    tabId = tab.id!
    await waitForLoad(tabId, timeoutMs)
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: fn })
    return (results[0]?.result as T) ?? null
  } catch (err) {
    console.warn(`[LeadSnapper] Failed to extract from ${url}:`, err)
    return null
  } finally {
    if (tabId !== undefined) chrome.tabs.remove(tabId).catch(() => {})
  }
}

function emptyEnrichedData(): EnrichedData {
  return {
    emails: [], phones: [], hasWhatsApp: false,
    social: {}, socialPresenceScore: 0,
    techStack: [], hasChatWidget: false, hasContactForm: false,
    hasOnlineOrdering: false, hasBookingSystem: false,
    hasNewsletter: false, hasCareersPage: false, hasPrivacyPolicy: false,
    businessListings: [], listingUrls: {},
    mentionsCompanyReg: false, mentionsTrademark: false, mentionsDuns: false,
    teamMembers: [],
    securitySignal: '', enrichedAt: new Date().toISOString(),
  }
}

function waitForLoad(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }, timeoutMs)

    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer)
        chrome.tabs.onUpdated.removeListener(listener)
        setTimeout(resolve, 800) // extra time for Maps JS to render
      }
    }

    chrome.tabs.onUpdated.addListener(listener)
  })
}
