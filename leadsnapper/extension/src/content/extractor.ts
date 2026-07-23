import type { ExtractedPageData, SearchResult } from '../types/lead'
import type { ScanLead } from '../types/scan'
import {
  extractEmails, extractPhones, extractDomain,
  LINKEDIN_COMPANY_RE, LINKEDIN_PERSON_RE,
  FACEBOOK_RE, INSTAGRAM_RE, TIKTOK_RE, YOUTUBE_RE, TWITTER_RE, THREADS_RE, WHATSAPP_RE,
} from '../utils/regex'
import { leadStableKey } from '../utils/leadKey'

function withStableId(partial: Partial<ScanLead>): Partial<ScanLead> {
  return { ...partial, id: leadStableKey(partial) }
}

// Title patterns that indicate a listicle / guide / non-business result
const LISTICLE_TITLE_RE = /^(top\s+\d+|best\s+\d+|is\s+.+\s+halal|where\s+to\s+find|complete\s+guide|ultimate\s+guide|\d+\s+best|\d+\s+top)/i

// ── Guard against double-injection ───────────────────────────────────────────
type InjectedWindow = Window & { __leadSnapperInjected?: boolean }
if (!(window as InjectedWindow).__leadSnapperInjected) {
  ;(window as InjectedWindow).__leadSnapperInjected = true

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'EXTRACT_PAGE') {
      void extractCurrentPageAsync()
        .then(data => sendResponse(data))
        .catch(() => sendResponse(extractCurrentPage()))
      return true
    }
    if (msg.type === 'SCAN_PAGE') {
      sendResponse(scanCurrentPage())
      return true
    }
  })

  // Scroll auto-scan disabled — user loads more via side panel "Load more" button
}

// ── Single-page extraction (website / LinkedIn / GMB listing) ─────────────────

function extractCurrentPage(): ExtractedPageData {
  const url  = window.location.href
  const host = window.location.hostname

  if (host.includes('google') && url.includes('/maps')) return extractGoogleMapsListing(url) as ExtractedPageData
  if (host.includes('google') && url.includes('/search'))  return extractGoogleSearchPage(url)
  if (host.includes('linkedin.com')) return scrapeLinkedInDom(url)
  if (host.includes('facebook.com') || host.includes('fb.com')) return extractSocialProfile(url, 'Facebook')
  if (host.includes('instagram.com')) return extractSocialProfile(url, 'Instagram')
  if (host.includes('tiktok.com')) return extractSocialProfile(url, 'TikTok')
  if (host.includes('youtube.com') || host.includes('youtu.be')) return extractSocialProfile(url, 'YouTube')
  if (host.includes('twitter.com') || host.includes('x.com')) return extractSocialProfile(url, 'Twitter')
  if (host.includes('threads.net')) return extractSocialProfile(url, 'Threads')
  return extractWebsite(url)
}

async function extractCurrentPageAsync(): Promise<ExtractedPageData> {
  const url  = window.location.href
  const host = window.location.hostname

  if (host.includes('google') && url.includes('/maps')) return extractGoogleMapsListing(url) as ExtractedPageData
  if (host.includes('google') && url.includes('/search')) return extractGoogleSearchPage(url)
  if (host.includes('linkedin.com')) return extractLinkedInAsync(url)
  if (host.includes('facebook.com') || host.includes('fb.com')) return extractSocialProfile(url, 'Facebook')
  if (host.includes('instagram.com')) return extractSocialProfile(url, 'Instagram')
  if (host.includes('tiktok.com')) return extractSocialProfile(url, 'TikTok')
  if (host.includes('youtube.com') || host.includes('youtu.be')) return extractSocialProfile(url, 'YouTube')
  if (host.includes('twitter.com') || host.includes('x.com')) return extractSocialProfile(url, 'Twitter')
  if (host.includes('threads.net')) return extractSocialProfile(url, 'Threads')
  return extractWebsite(url)
}

// ── Bulk page scan (Google Search / Google Maps results list) ─────────────────

function scanCurrentPage(): { leads: Partial<ScanLead>[]; pageType: string; filteredCount: number } {
  const url    = window.location.href
  const host   = window.location.hostname
  const params = new URLSearchParams(window.location.search)

  if (host.includes('google') && url.includes('/maps')) {
    const { leads, filteredCount } = scanGoogleMapsResults()
    return { leads, pageType: 'Google Maps', filteredCount }
  }

  if (host.includes('google') && url.includes('/search')) {
    // Unified local scanner — Places tab, local pack, map sidebar (URL may omit tbm=lcl)
    const { leads, filteredCount } = scanGoogleLocalResults()
    return { leads, pageType: 'Google Search', filteredCount }
  }

  return { leads: [], pageType: 'other', filteredCount: 0 }
}

// ── Google Search — Places tab (tbm=lcl / udm=14) ────────────────────────────
// Split-view layout: business cards on the left, Google Map on the right.
// DOM differs completely from the regular search page — needs its own scanner.

/** @deprecated Use scanGoogleLocalResults — kept as alias */
function scanGooglePlacesTab(): { leads: Partial<ScanLead>[]; filteredCount: number } {
  return scanGoogleLocalResults()
}

// ── Google Maps: scan all visible result cards ────────────────────────────────

function scanGoogleMapsResults(): { leads: Partial<ScanLead>[]; filteredCount: number } {
  const now   = new Date()
  const date  = now.toISOString().slice(0, 10)
  const time  = now.toTimeString().slice(0, 8)
  const query = extractMapsQuery()
  const results: Partial<ScanLead>[] = []
  let filteredCount = 0

  // Collect all article cards and place anchors, deduplicate by Maps URL
  const rawCards = [
    ...document.querySelectorAll('div[role="article"]'),
    ...document.querySelectorAll('a[href*="/maps/place/"]'),
  ]
  const seen = new Set<string>()
  const unique = rawCards.filter(el => {
    const href = (el as HTMLAnchorElement).href
      ?? el.querySelector('a[href*="/maps/place/"]')?.getAttribute('href')
      ?? ''
    if (!href || seen.has(href)) return false
    seen.add(href)
    return true
  })

  for (const card of unique) {
    const anchor   = (card.tagName === 'A' ? card : card.querySelector('a[href*="/maps/place/"]')) as HTMLAnchorElement | null
    const mapsUrl  = anchor?.href ?? ''
    const fullText = (card as HTMLElement).innerText ?? card.textContent ?? ''

    // ── Business name ─────────────────────────────────────────────────────────
    const nameEl = card.querySelector('.fontHeadlineSmall, .qBF1Pd, .NrDZNb, [jsan*="title"]')
      ?? card.querySelector('[aria-label]')
    let name = (nameEl as HTMLElement)?.getAttribute('aria-label')?.split('\n')[0]?.trim()
      || (nameEl as HTMLElement)?.innerText?.split('\n')[0]?.trim()
      || ''
    if (!name) {
      const labeled = card.querySelector('[aria-label]') as HTMLElement | null
      name = labeled?.getAttribute('aria-label')?.split('\n')[0]?.trim() ?? ''
    }
    if (!name) continue

    // ── Rating ────────────────────────────────────────────────────────────────
    let rating: number | undefined
    const ratingCandidates = [
      ...card.querySelectorAll('[aria-label*="stars"], [aria-label*="star "], [aria-label*="rating"]'),
      ...card.querySelectorAll('.MW4etd, .ZkP5Je, .UzEDed'),
    ]
    for (const el of ratingCandidates) {
      const label = el.getAttribute('aria-label') ?? el.textContent ?? ''
      const m     = label.match(/([\d.]+)\s*star/) ?? label.match(/^([\d.]+)$/)
      if (m) { rating = parseFloat(m[1]); break }
    }

    // ── Review count ──────────────────────────────────────────────────────────
    let reviews: number | undefined
    const reviewCandidates = [
      ...card.querySelectorAll('[aria-label*="review"], [aria-label*="Review"]'),
      ...card.querySelectorAll('.UY7F9, .e4rVHe, .RDApEe'),
    ]
    for (const el of reviewCandidates) {
      const label = el.getAttribute('aria-label') ?? el.textContent ?? ''
      const m     = label.match(/([\d,]+)/)
      if (m) { reviews = parseInt(m[1].replace(/,/g, '')); break }
    }
    if (!reviews) {
      const rvText = fullText.match(/\(([\d,]+)\)|(\d[\d,]+)\s+review/)
      if (rvText) reviews = parseInt((rvText[1] ?? rvText[2]).replace(/,/g, ''))
    }

    // ── Category ─────────────────────────────────────────────────────────────
    let category = ''
    const allEls = [...card.querySelectorAll('span, div')] as HTMLElement[]
    for (const el of allEls) {
      const t = el.innerText?.trim()
      if (!t || t === '·' || t.length < 3 || t.length > 80) continue
      if (/restaurant|hotel|store|shop|agency|service|company|care|gym|clinic|cafe|bar|pub|salon|spa|dental|medical|school|college|university|pharmacy|bank|solicitor|accountant|estate|letting|plumber|electrician|builder|contractor|takeaway|pizz|curry|sushi/i.test(t)) {
        category = t; break
      }
    }

    // ── Address ───────────────────────────────────────────────────────────────
    let address = ''
    for (const el of allEls) {
      const t = el.innerText?.trim()
      if (!t) continue
      if (/\d+\s+\w+\s+(?:road|rd|street|st|lane|ln|avenue|ave|close|way|place|square|drive|court|crescent)/i.test(t)
        || /[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}/i.test(t)) {
        address = t; break
      }
    }

    // ── Open/closed status ────────────────────────────────────────────────────
    const statusEl   = card.querySelector('.ZDu9vd, .YhemCb, [aria-label*="Open"], [aria-label*="Closed"]')
    const openStatus = (statusEl as HTMLElement)?.innerText?.trim()

    // ── Phone ─────────────────────────────────────────────────────────────────
    const phoneMatch = fullText.match(/(\+44[\d\s\-()+]{8,}|0[12378]\d[\d\s\-()+]{7,}|\+1[\d\s\-()+]{9,})/)

    // ── Website link (sometimes shown in card) ────────────────────────────────
    // Apply domain filter — skip cards whose visible website is an aggregator
    let websiteUrl = ''
    for (const a of [...card.querySelectorAll('a[href]')] as HTMLAnchorElement[]) {
      if (a.href?.startsWith('http') && !a.href.includes('google.com')) {
        if (isBusinessLink(a.href, name)) { websiteUrl = a.href }
        break
      }
    }

    // ── City from address ─────────────────────────────────────────────────────
    const city = address.split(',').filter(p => !/^\s*\d/.test(p)).pop()?.trim() ?? ''

    const { score, priority } = quickScore({ rating, reviews, category, hasPhone: !!phoneMatch })

    results.push(withStableId({
      sourceType:    'Google Maps',
      sourceUrl:     mapsUrl || window.location.href,
      googleMapsUrl: mapsUrl || undefined,
      websiteUrl:    websiteUrl || undefined,
      domain:        websiteUrl ? extractDomain(websiteUrl) : undefined,
      searchQuery:   query,
      businessName:  name,
      category:      category  || undefined,
      googleRating:  rating,
      googleReviews: reviews,
      address:       address   || undefined,
      city:          city      || undefined,
      phone:         phoneMatch?.[0]?.trim() ?? undefined,
      openStatus:    openStatus || undefined,
      enrichStatus:  'pending',
      ownerVerified: false,
      serviceFit:    [],
      selected:      false,
      verified:      false,
      leadScore:     score,
      leadPriority:  priority,
      captureDate:   date,
      captureTime:   time,
    }))
  }

  console.log(`[LeadSnapper] Maps scan — captured: ${results.length}, filtered: ${filteredCount}`)
  return { leads: results, filteredCount }
}

// ── Maps URL helpers (regular Search + Places tab + sidebar local panel) ─────

const LOCAL_NOISE_NAME_RE = /^(sponsored|ad|places|more places|open now|closed|directions|website|call|save|share|map)$/i

function unwrapGoogleRedirect(href: string): string {
  try {
    const u = new URL(href, window.location.origin)
    if ((u.hostname.includes('google.') && u.pathname === '/url') || u.pathname === '/url') {
      const q = u.searchParams.get('q') || u.searchParams.get('url')
      if (q) return q
    }
  } catch { /* ignore */ }
  return href
}

function isMapsBusinessUrl(href: string): boolean {
  const h = unwrapGoogleRedirect(href)
  if (!h) return false
  if (/\/maps\/place\//i.test(h)) return true
  if (/google\.[a-z.]+\/maps/i.test(h) && /[?&](cid|ftid|ludocid)=\d+/i.test(h)) return true
  if (/maps\.google\.[a-z.]+/i.test(h) && /place|cid/i.test(h)) return true
  return false
}

function normalizeMapsUrl(href: string): string {
  const h = unwrapGoogleRedirect(href)
  try {
    const u = new URL(h, window.location.origin)
    if (u.pathname.includes('/maps/place/')) {
      const path = u.pathname.split('/data=')[0]
      return u.origin + path + u.search
    }
    if (/[?&](cid|ftid)=\d+/i.test(u.search)) return u.origin + u.pathname + u.search
    return h.split('#')[0]
  } catch {
    return h.split('#')[0]
  }
}

function businessNameFromMapsPlaceUrl(url: string): string {
  try {
    const m = url.match(/\/maps\/place\/([^/@?]+)/)
    if (m) return decodeURIComponent(m[1].replace(/\+/g, ' '))
  } catch { /* ignore */ }
  return ''
}

function cidToMapsUrl(cid: string): string | null {
  if (!cid) return null
  if (/^\d+$/.test(cid)) return `https://www.google.com/maps?cid=${cid}`
  const hex = cid.match(/^0x[0-9a-f]+:(0x[0-9a-f]+)$/i)
  if (hex) {
    try {
      return `https://www.google.com/maps?cid=${BigInt(hex[1]).toString()}`
    } catch { /* ignore */ }
  }
  return null
}

function resolveMapsUrlFromHref(href: string): string | null {
  if (!href) return null
  const unwrapped = unwrapGoogleRedirect(href)
  if (isMapsBusinessUrl(unwrapped)) return normalizeMapsUrl(unwrapped)
  if (/\/maps\/place\//i.test(unwrapped)) return normalizeMapsUrl(unwrapped)
  try {
    const u = new URL(unwrapped, window.location.origin)
    const ludocid = u.searchParams.get('ludocid')
      || u.searchParams.get('cid')
      || u.searchParams.get('ftid')
    if (ludocid && /^\d+$/.test(ludocid)) return `https://www.google.com/maps?cid=${ludocid}`
    const dataParam = u.pathname.includes('/maps/place/') ? u.href : ''
    if (dataParam) return normalizeMapsUrl(dataParam)
  } catch { /* ignore */ }
  return null
}

function resolveMapsUrlFromElement(el: Element): string {
  const anchors = [
    ...(el.tagName === 'A' ? [el as HTMLAnchorElement] : []),
    ...el.querySelectorAll('a[href], a[data-url]'),
  ] as HTMLAnchorElement[]
  for (const a of anchors) {
    const href = a.href || a.getAttribute('data-url') || ''
    const resolved = resolveMapsUrlFromHref(href)
    if (!resolved) continue
    const label = (a.innerText ?? a.getAttribute('aria-label') ?? '').trim().toLowerCase()
    if (/^(directions|view larger map|map)$/i.test(label)) continue
    return resolved
  }
  const placeId = el.getAttribute('data-place-id')
    ?? el.querySelector('[data-place-id]')?.getAttribute('data-place-id')
  if (placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`
  }
  for (const attr of ['data-cid', 'data-ludocid', 'data-pid']) {
    const val = el.getAttribute(attr)
      ?? el.querySelector(`[${attr}]`)?.getAttribute(attr)
    const maps = val ? cidToMapsUrl(val) : null
    if (maps) return maps
  }
  return ''
}

function resolveMapsUrlFromCard(card: Element): string {
  const chain: Element[] = [card]
  let node: Element | null = card
  for (let i = 0; i < 8 && node?.parentElement; i++) {
    node = node.parentElement
    chain.push(node)
  }
  for (const el of chain) {
    const url = resolveMapsUrlFromElement(el)
    if (url) return url
  }
  return ''
}

function nameFromMapsAnchor(a: Element): string {
  const label = (a as HTMLElement).getAttribute('aria-label')?.trim()
    || (a as HTMLElement).innerText?.trim()
  if (!label || label.length < 2 || label.length > 120) return ''
  if (LOCAL_NOISE_NAME_RE.test(label)) return ''
  return label.split('·')[0].split(',')[0].trim()
}

function pickBusinessNameFromCard(card: Element, text: string, mapsUrl: string, preferredName?: string): string {
  if (preferredName && !LOCAL_NOISE_NAME_RE.test(preferredName)) return preferredName
  let name = businessNameFromMapsPlaceUrl(mapsUrl)
  if (name) return name
  if (card.tagName === 'A') {
    const fromAnchor = nameFromMapsAnchor(card)
    if (fromAnchor) return fromAnchor
  }
  for (const a of card.querySelectorAll('a.hfpxzc, a[href*="/maps/place"], a[href*="maps.google"]')) {
    const fromAnchor = nameFromMapsAnchor(a)
    if (fromAnchor) return fromAnchor
  }
  const nameSelectors = [
    '.dbg0pd', '[role="heading"]', 'h3', 'h2', '.OSrXXb', '.DI9zgc',
    '.qBF1Pd', '.fontHeadlineSmall', '.NrDZNb', '.rllt__details', 'span[jsan]',
    '.bNg8Rb', '.dfe0re', '.fontBodyMedium', '.lOLeaf', 'span[role="heading"]',
  ]
  for (const sel of nameSelectors) {
    const el = card.querySelector(sel) as HTMLElement | null
    const t  = el?.innerText?.trim()
    if (t && t.length > 1 && t.length < 120 && !LOCAL_NOISE_NAME_RE.test(t)) return t
  }
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1 && l.length < 120)
  return lines.find(l => !LOCAL_NOISE_NAME_RE.test(l)) ?? ''
}

function collectLocalCardCandidates(): Set<Element> {
  const cardSet = new Set<Element>()
  const skipSelector = 'footer, header, nav, [role="navigation"], [role="banner"]'

  const add = (el: Element | null | undefined) => {
    if (!el || el.closest(skipSelector)) return
    cardSet.add(el)
  }

  // Places tab + local pack — primary layouts
  document.querySelectorAll(
    'a.rllt__link, a.hfpxzc, .rllt__container, .rllt__details, .uMdZh, .VkpGBb, .cXedhc, .Nv2PK, .bfdHYd, .Ww4FFb, .lOLeaf, .C8TUKc, .lzMb8c, [role="article"]',
  ).forEach(el => add(el))

  // GMB identifiers on any search layout
  document.querySelectorAll('[data-cid], [data-place-id], [data-ludocid]').forEach(el => add(el))

  // Walk up from Maps / redirect links
  document.querySelectorAll('a[href], a[data-url]').forEach(a => {
    if (a.closest(skipSelector)) return
    const href = (a as HTMLAnchorElement).href || a.getAttribute('data-url') || ''
    if (!resolveMapsUrlFromHref(href) && !/\/maps\/place\//i.test(href)) return
    add(cardContainerForMapsAnchor(a as HTMLAnchorElement))
  })

  // Local section headings
  for (const h of document.querySelectorAll('h2, h3, div[role="heading"], span[role="heading"]')) {
    const label = h.textContent?.trim() ?? ''
    if (!/^(places|local results|businesses|businesses near|nearby|top rated|more places|map|sponsored)$/i.test(label)) continue
    const section = h.closest('div, section, aside') ?? h.parentElement
    section?.querySelectorAll('a[href], [data-cid], [data-place-id]').forEach(el => {
      add(el.tagName === 'A' ? cardContainerForMapsAnchor(el as HTMLAnchorElement) : el)
    })
  }

  // Right panel / knowledge local card
  for (const sel of ['#rhs', '#kp-wp-tab-overview', '[data-attrid*="kc:/local"]', '[data-subtype="local"]']) {
    document.querySelectorAll(sel).forEach(panel => {
      panel.querySelectorAll('a[href], [data-cid], [data-place-id]').forEach(el => {
        add(el.tagName === 'A' ? cardContainerForMapsAnchor(el as HTMLAnchorElement) : el)
      })
    })
  }

  // jsaction local panes (Places tab detail + list rows)
  document.querySelectorAll('[jsaction*="pane"], [jsaction*="local"], [data-feature-id]').forEach(el => {
    if (el.querySelector('[data-cid], a[href*="maps"]')) add(el)
  })

  return cardSet
}

function cardContainerForMapsAnchor(a: HTMLAnchorElement): Element {
  let el: Element = a
  for (let i = 0; i < 6; i++) {
    const p = el.parentElement
    if (!p || p === document.body) break
    const t = (p as HTMLElement).innerText?.trim() ?? ''
    if (t.length > 25 && (p as HTMLElement).offsetHeight > 40) return p
    el = p
  }
  return a
}

function pushLocalBusinessLead(
  card: Element,
  mapsUrl: string,
  query: string,
  date: string,
  time: string,
  results: Partial<ScanLead>[],
  filteredCountRef: { n: number },
  seen: Set<string>,
  preferredName?: string,
): void {
  if (!mapsUrl || seen.has(mapsUrl)) return
  seen.add(mapsUrl)

  const text = (card as HTMLElement).innerText ?? card.textContent ?? ''
  const name = pickBusinessNameFromCard(card, text, mapsUrl, preferredName)
  if (!name) return
  if (text.trim() && text.trim().length < 4 && !businessNameFromMapsPlaceUrl(mapsUrl)) return
  if (LISTICLE_TITLE_RE.test(name)) { filteredCountRef.n++; return }

  let rating: number | undefined
  for (const el of card.querySelectorAll('[aria-label*="star"], [aria-label*="rating"], [aria-label*="Star"]')) {
    const m = el.getAttribute('aria-label')?.match(/([\d.]+)\s*star/i)
    if (m) { rating = parseFloat(m[1]); break }
  }
  if (!rating) {
    const m = text.match(/\b([1-5]\.\d)\b/)
    if (m) rating = parseFloat(m[1])
  }

  let reviews: number | undefined
  const rvMatch = text.match(/\(([\d,.]+K?)\)/i)
  if (rvMatch) {
    const raw = rvMatch[1].replace(/,/g, '')
    reviews = raw.toUpperCase().endsWith('K')
      ? Math.round(parseFloat(raw) * 1000)
      : parseInt(raw)
  }
  if (!reviews) {
    for (const el of card.querySelectorAll('[aria-label*="review"], [aria-label*="Review"]')) {
      const m = el.getAttribute('aria-label')?.match(/([\d,]+)/)
      if (m) { reviews = parseInt(m[1].replace(/,/g, '')); break }
    }
  }

  const priceMatch = text.match(/[£$€]\d+[–\-]\d+/)
  const priceRange = priceMatch?.[0] ?? undefined

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let category = ''
  for (const line of lines) {
    const catMatch = line.match(/·\s*(?:[£$€]\d[^\·\n]*)?\s*·?\s*([A-Za-z][A-Za-z\s&]{2,30})\s*$/)
      ?? line.match(/\)\s*·\s*(?:[£$€]\S+\s*·\s*)?([A-Za-z][A-Za-z\s&]{2,25})\s*$/)
    if (catMatch) { category = catMatch[1].trim(); break }
  }

  let address = ''
  for (const line of lines) {
    if (/^\d+[-–]?\d*\s+[A-Za-z]/.test(line) || /[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}/.test(line)) {
      address = line; break
    }
  }
  const city = address.split(',').filter(p => !/^\s*\d/.test(p)).pop()?.trim() ?? ''

  const statusMatch = text.match(/(Closed|Open now|Opens\s+\d|Temporarily closed)[^\n]*/i)
  const openStatus  = statusMatch?.[0]?.trim() ?? undefined

  const snippetMatch = text.match(/"([^"]{15,200})"/)
  const snippet      = snippetMatch?.[1]?.trim() ?? undefined

  const { score, priority } = quickScore({ rating, reviews, category })

  results.push(withStableId({
    sourceType:    'Google Maps',
    sourceUrl:     mapsUrl,
    googleMapsUrl: mapsUrl,
    searchQuery:   query,
    businessName:  name,
    category:      category   || undefined,
    googleRating:  rating,
    googleReviews: reviews,
    priceRange,
    address:       address    || undefined,
    city:          city       || undefined,
    openStatus,
    snippet,
    enrichStatus:  'pending',
    ownerVerified: false,
    serviceFit:    [],
    selected:      false,
    verified:      false,
    leadScore:     score,
    leadPriority:  priority,
    captureDate:   date,
    captureTime:   time,
  }))
}

// ── Google Search / Places tab — all local business cards ────────────────────

function scanFromMapsAnchors(
  query: string,
  date: string,
  time: string,
  results: Partial<ScanLead>[],
  filteredRef: { n: number },
  seen: Set<string>,
): void {
  const skipSelector = 'footer, header, nav, [role="navigation"], [role="banner"]'
  const anchorSelectors = [
    'a.hfpxzc',
    'a[href*="/maps/place"]',
    'a[href*="maps.google"][href*="place"]',
    'a[data-url*="/maps/place"]',
  ]
  const anchors = new Set<HTMLAnchorElement>()
  for (const sel of anchorSelectors) {
    document.querySelectorAll(sel).forEach(el => {
      if (el.closest(skipSelector)) return
      anchors.add(el as HTMLAnchorElement)
    })
  }

  for (const a of anchors) {
    const href = a.href || a.getAttribute('data-url') || ''
    let mapsUrl = resolveMapsUrlFromHref(href)
      || (/\/maps\/place\//i.test(href) ? normalizeMapsUrl(href) : '')
    if (!mapsUrl) {
      const cid = a.getAttribute('data-cid')
        || a.closest('[data-cid]')?.getAttribute('data-cid')
      mapsUrl = cid ? (cidToMapsUrl(cid) ?? '') : ''
    }
    if (!mapsUrl) continue
    const preferredName = nameFromMapsAnchor(a)
    pushLocalBusinessLead(
      cardContainerForMapsAnchor(a),
      mapsUrl,
      query,
      date,
      time,
      results,
      filteredRef,
      seen,
      preferredName || undefined,
    )
  }
}

function scanFromCidElements(
  query: string,
  date: string,
  time: string,
  results: Partial<ScanLead>[],
  filteredRef: { n: number },
  seen: Set<string>,
): void {
  const skipSelector = 'footer, header, nav, [role="navigation"], [role="banner"]'
  document.querySelectorAll('[data-cid]').forEach(el => {
    if (el.closest(skipSelector)) return
    const cid = el.getAttribute('data-cid')
    const mapsUrl = cid ? cidToMapsUrl(cid) : null
    if (!mapsUrl || seen.has(mapsUrl)) return
    let card: Element = el
    for (let i = 0; i < 5 && card.parentElement; i++) {
      const p = card.parentElement
      const t = (p as HTMLElement).innerText?.trim() ?? ''
      if (t.length > 20) { card = p; break }
      card = p
    }
    pushLocalBusinessLead(card, mapsUrl, query, date, time, results, filteredRef, seen)
  })
}

function scanGoogleLocalResults(): { leads: Partial<ScanLead>[]; filteredCount: number } {
  const now   = new Date()
  const date  = now.toISOString().slice(0, 10)
  const time  = now.toTimeString().slice(0, 8)
  const query = new URLSearchParams(window.location.search).get('q') ?? ''
  const results: Partial<ScanLead>[] = []
  const seen  = new Set<string>()
  const filteredRef = { n: 0 }

  // Pass 1: maps place anchors (local pack + Places tab — most reliable)
  scanFromMapsAnchors(query, date, time, results, filteredRef, seen)

  // Pass 2: card containers from structural selectors
  const cardSet = collectLocalCardCandidates()
  for (const card of cardSet) {
    const mapsUrl = resolveMapsUrlFromCard(card)
    pushLocalBusinessLead(card, mapsUrl, query, date, time, results, filteredRef, seen)
  }

  // Pass 3: data-cid fallbacks when maps href is missing from card DOM
  scanFromCidElements(query, date, time, results, filteredRef, seen)

  const params = new URLSearchParams(window.location.search)
  console.log(
    `[LeadSnapper] Local scan — candidates: ${cardSet.size}, captured: ${results.length},`,
    `filtered: ${filteredRef.n}, tbm=${params.get('tbm')}, hfpxzc=${document.querySelectorAll('a.hfpxzc').length},`,
    `data-cid=${document.querySelectorAll('[data-cid]').length}`,
  )
  return { leads: results, filteredCount: filteredRef.n }
}

/** @deprecated Use scanGoogleLocalResults */
function scanGoogleSearchPlaces(): { leads: Partial<ScanLead>[]; filteredCount: number } {
  return scanGoogleLocalResults()
}

// ── Business-link classifier ──────────────────────────────────────────────────
// Rejects aggregator/blog/review/listicle URLs before any deep extraction.

const BLOCKED_DOMAINS = new Set([
  // Food & lifestyle aggregators / guides (explicitly requested)
  'tripadvisor.com','tripadvisor.co.uk',
  'yelp.com','yelp.co.uk',
  'timeout.com','timeout.co.uk',
  'theguardian.com','guardian.com',
  'mirror.co.uk',
  'dailymail.co.uk','mailonline.co.uk',
  'squaremeal.co.uk',
  'designmynight.com',
  'londonist.com',
  // Other review / directory sites
  'trustpilot.com',
  'yell.com','checkatrade.com','bark.com','ratedpeople.com',
  'houzz.com','houzz.co.uk','thomsonlocal.com','freeindex.co.uk',
  'cylex.co.uk','scoot.co.uk','thebestof.co.uk','192.com','ukplc.net',
  // Business databases / companies registries
  'companieshouse.gov.uk','companies-house.gov.uk',
  'find-and-update.company-information.service.gov.uk',
  'endole.co.uk','duedil.com','opencorporates.com','dnb.com',
  'creditsafe.com','bizbuysell.com','companieshouse.com',
  // Social media & UGC platforms
  'linkedin.com','facebook.com','instagram.com','twitter.com','x.com',
  'tiktok.com','youtube.com','pinterest.com','reddit.com','quora.com',
  'twitch.tv','patreon.com','snapchat.com',
  // B2B software platforms
  'clutch.co','g2.com','capterra.com','getapp.com','softwareadvice.com',
  'sourceforge.net','alternativeto.net','producthunt.com',
  // Blog / content platforms
  'medium.com','wordpress.com','blogger.com','substack.com','tumblr.com',
  'beehiiv.com','ghost.io','wixsite.com',
  // News & media
  'bbc.co.uk','bbc.com','telegraph.co.uk','independent.co.uk',
  'forbes.com','techcrunch.com','businessinsider.com','inc.com','entrepreneur.com',
  // Government
  'gov.uk','hmrc.gov.uk','ico.org.uk','ipo.gov.uk',
  // Marketplaces & delivery
  'amazon.com','amazon.co.uk','ebay.com','ebay.co.uk','etsy.com',
  'justeat.co.uk','ubereats.com','deliveroo.co.uk','doordash.com',
  'booking.com','airbnb.com','hotels.com','expedia.com','opentable.com',
  // General
  'google.com','google.co.uk','bing.com','yahoo.com','duckduckgo.com',
  'wikipedia.org','wikihow.com',
  // Jobs
  'glassdoor.com','indeed.com','totaljobs.com','reed.co.uk','cv-library.co.uk',
  // PR / press
  'prnewswire.com','businesswire.com','globenewswire.com','prlog.org',
  'accesswire.com','einpresswire.com',
])

/**
 * Returns true only if the URL + title combination represents an actual
 * business website — not an aggregator, blog, listicle, or review platform.
 */
function isBusinessLink(url: string, title: string): boolean {
  if (!url) return false
  const domain = extractDomain(url).toLowerCase().replace(/^www\./, '')
  // Domain blocklist check
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain === blocked || domain.endsWith('.' + blocked)) return false
  }
  // Title pattern check — rejects listicles / guides masquerading as businesses
  if (LISTICLE_TITLE_RE.test(title.trim())) return false
  return true
}

// ── Google Search: scan all organic results ───────────────────────────────────

function scanGoogleSearchResults(): { leads: Partial<ScanLead>[]; filteredCount: number } {
  const now   = new Date()
  const date  = now.toISOString().slice(0, 10)
  const time  = now.toTimeString().slice(0, 8)
  const query = new URLSearchParams(window.location.search).get('q') ?? ''
  const leads: Partial<ScanLead>[] = []
  let filteredCount = 0
  let rank = 0

  const resultEls = document.querySelectorAll('div.g, div[data-sokoban-container], div[jscontroller]:has(h3)')

  for (const el of resultEls) {
    const titleEl   = el.querySelector('h3')
    const linkEl    = el.querySelector('a[href]') as HTMLAnchorElement | null
    const snippetEl = el.querySelector('.VwiC3b, [data-sncf], .s3v9rd, div.IsZvec')

    if (!titleEl || !linkEl) continue
    const href  = linkEl.href
    const title = titleEl.textContent?.trim() ?? ''
    if (!href || href.includes('google.com/search') || href.startsWith('#')) continue

    if (!isBusinessLink(href, title)) {
      filteredCount++
      continue
    }

    rank++
    const domain = extractDomain(href)
    const { score, priority } = quickScore({ domain })

    leads.push({
      id:           crypto.randomUUID(),
      sourceType:   'Google Search',
      sourceUrl:    href,
      websiteUrl:   href,
      domain,
      searchQuery:  query,
      googleRank:   rank,
      businessName: title || domain,
      snippet:      snippetEl?.textContent?.trim() ?? undefined,
      enrichStatus: 'pending',
      ownerVerified: false,
      serviceFit:   [],
      selected:     false,
      verified:     false,
      leadScore:    score,
      leadPriority: priority,
      captureDate:  date,
      captureTime:  time,
    })
  }

  console.log(`[LeadSnapper] Organic scan — captured: ${leads.length}, filtered: ${filteredCount}`)
  return { leads, filteredCount }
}

// ── Quick score (before enrichment) ──────────────────────────────────────────

function quickScore({ rating, reviews, category, hasPhone, domain }: {
  rating?: number; reviews?: number; category?: string; hasPhone?: boolean; domain?: string
}): { score: number; priority: 'Hot' | 'Warm' | 'Cold' } {
  let score = 10 // base
  if (hasPhone || domain) score += 10
  if ((reviews ?? 0) > 100) score += 10
  if (typeof rating === 'number' && rating < 4.0) score += 5
  if (/restaurant|takeaway|cafe|food|pizza/i.test(category ?? '')) score += 15
  if (/construction|infrastructure|engineering/i.test(category ?? '')) score += 20
  if (/oracle|unifier|primavera/i.test(category ?? '')) score += 35
  const capped = Math.min(score, 100)
  return { score: capped, priority: capped >= 70 ? 'Hot' : capped >= 40 ? 'Warm' : 'Cold' }
}

function extractMapsQuery(): string {
  // Google Maps encodes the search query in the URL or page title
  const titleMatch = document.title.match(/^(.+?)\s*[-·|]/)
  return titleMatch?.[1]?.trim()
    ?? new URLSearchParams(window.location.search).get('q')
    ?? ''
}

// ── Google Maps single listing ────────────────────────────────────────────────

function extractGoogleMapsListing(url: string): Partial<ExtractedPageData> {
  const data: Partial<ExtractedPageData> = { sourceType: 'Google Maps', sourceUrl: url }

  const nameEl = document.querySelector('h1.DUwDvf, [data-attrid="title"] span')
  if (nameEl) data.businessName = nameEl.textContent?.trim()

  const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]')
  if (ratingEl) data.googleRating = parseFloat(ratingEl.textContent?.trim() ?? '')

  const reviewEl = document.querySelector('div.F7nice span[aria-label*="review"]')
  if (reviewEl) {
    const m = reviewEl.getAttribute('aria-label')?.match(/[\d,]+/)
    if (m) data.googleReviews = parseInt(m[0].replace(/,/g, ''))
  }

  const addrEl = document.querySelector('[data-item-id="address"] .Io6YTe')
  if (addrEl) {
    data.address = addrEl.textContent?.trim()
    const cityMatch = data.address?.match(/,\s*([^,]+),?\s*\w+\s*\d/)
    if (cityMatch) data.city = cityMatch[1].trim()
  }

  const phoneEl = document.querySelector('[data-item-id*="phone"] .Io6YTe')
  if (phoneEl) data.phone = phoneEl.textContent?.trim()

  const websiteEl = document.querySelector('[data-item-id*="authority"] .Io6YTe')
  if (websiteEl) {
    data.website  = websiteEl.textContent?.trim()
    data.domain   = data.website ? extractDomain(data.website) : undefined
  }

  const catEl = document.querySelector('button.DkEaL')
  if (catEl) data.category = catEl.textContent?.trim()

  const hoursEl = document.querySelector('[jsaction*="openhours"] .OqCZI')
  if (hoursEl) data.openingHours = hoursEl.textContent?.trim()

  return data
}

// ── Google Search single-result page extraction ───────────────────────────────

function extractGoogleSearchPage(url: string): ExtractedPageData {
  const kw = new URLSearchParams(window.location.search).get('q') ?? ''
  const searchResults: SearchResult[] = []
  let rank = 1

  document.querySelectorAll('div.g:not(.related-question-pair)').forEach(el => {
    const titleEl  = el.querySelector('h3')
    const linkEl   = el.querySelector('a[href]') as HTMLAnchorElement | null
    const snipEl   = el.querySelector('.VwiC3b, .s3v9rd, [data-sncf]')
    if (!titleEl || !linkEl) return
    const href = linkEl.href
    if (!href || href.startsWith('https://www.google')) return
    searchResults.push({ title: titleEl.textContent?.trim() ?? '', url: href, snippet: snipEl?.textContent?.trim(), domain: extractDomain(href), rank: rank++ })
  })

  return {
    sourceType: 'Google Search',
    sourceUrl:  url,
    searchKeyword: kw,
    searchResults: searchResults.slice(0, 15),
    businessName: searchResults[0]?.title,
    website:      searchResults[0]?.url,
    domain:       searchResults[0]?.domain,
  }
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────

function parseLinkedInTitle(): string {
  const og = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
  if (og) {
    const name = og
      .replace(/\s*[|–-]\s*LinkedIn.*$/i, '')
      .replace(/\s+on\s+LinkedIn.*$/i, '')
      .trim()
    if (name) return name
  }
  const title = document.title.replace(/\s*[|–-]\s*LinkedIn.*$/i, '').trim()
  const dash = title.split(/\s+[–-]\s+/)[0]?.trim()
  return dash || title
}

function linkedInProfileName(): string {
  const selectors = [
    'h1.text-heading-xlarge',
    'h1.top-card-layout__title',
    'h1.org-top-card-summary__title',
    'main h1',
    '.pv-text-details__left-panel h1',
    '[data-anonymize="person-name"]',
    'section.artdeco-card h1',
  ]
  for (const sel of selectors) {
    const t = document.querySelector(sel)?.textContent?.trim()
    if (t && t.length > 1 && t.length < 120) return t
  }
  return parseLinkedInTitle()
}

function linkedInHeadline(): string | undefined {
  const selectors = [
    '.text-body-medium.break-words',
    '.org-top-card-summary-info-list__info-item',
    '.pv-text-details__left-panel .text-body-medium',
    '[data-generated-suggestion-target]',
    '.top-card-layout__headline',
  ]
  for (const sel of selectors) {
    const t = document.querySelector(sel)?.textContent?.trim()
    if (t && t.length > 2 && t.length < 300) return t
  }
  return undefined
}

function slugFromLinkedInUrl(cleanUrl: string, kind: 'person' | 'company'): string | undefined {
  const m = kind === 'person'
    ? cleanUrl.match(/linkedin\.com\/in\/([^/?#]+)/i)
    : cleanUrl.match(/linkedin\.com\/company\/([^/?#]+)/i)
  if (!m?.[1]) return undefined
  const slug = decodeURIComponent(m[1]).replace(/-/g, ' ').trim()
  if (!slug || /^\d+$/.test(slug)) return undefined
  return slug.replace(/\b\w/g, c => c.toUpperCase())
}

function scrapeLinkedInDom(url: string): ExtractedPageData {
  const cleanUrl = url.split('?')[0].split('#')[0]
  const isPerson = /linkedin\.com\/in\//i.test(cleanUrl)
  const isCompany = /linkedin\.com\/company\//i.test(cleanUrl)
  const data: ExtractedPageData = { sourceType: 'LinkedIn', sourceUrl: url }

  const name = linkedInProfileName()
    || slugFromLinkedInUrl(cleanUrl, isPerson ? 'person' : 'company')
    || slugFromLinkedInUrl(cleanUrl, 'company')
  const headline = linkedInHeadline()

  if (isPerson) {
    if (name) {
      data.ownerName = name
      data.businessName = name
    }
    data.decisionMakerLinkedin = cleanUrl
    data.linkedinUrl = cleanUrl
    if (headline) {
      data.industry = headline
      data.category = headline
    }
  } else if (isCompany) {
    if (name) data.businessName = name
    data.linkedinUrl = cleanUrl
    if (headline) data.industry = headline
  } else if (name) {
    data.businessName = name
    data.linkedinUrl = cleanUrl
  } else {
    data.linkedinUrl = cleanUrl
  }

  for (const a of document.querySelectorAll('a[href]')) {
    const href = (a as HTMLAnchorElement).href
    if (!href || href.includes('linkedin.com') || !href.startsWith('http')) continue
    const domain = extractDomain(href)
    if (domain && !domain.includes('linkedin')) {
      data.website = href
      data.domain = domain
      break
    }
  }

  return data
}

function hasLinkedInIdentity(data: ExtractedPageData): boolean {
  return !!(data.ownerName || data.businessName)
}

async function extractLinkedInAsync(url: string): Promise<ExtractedPageData> {
  let data = scrapeLinkedInDom(url)
  if (hasLinkedInIdentity(data)) return data
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250))
    data = scrapeLinkedInDom(url)
    if (hasLinkedInIdentity(data)) return data
  }
  return data
}

// ── Social profile pages (Facebook, Instagram, TikTok, YouTube, X, Threads) ──

function extractSocialProfile(
  url: string,
  sourceType: ExtractedPageData['sourceType']
): ExtractedPageData {
  const data: ExtractedPageData = { sourceType, sourceUrl: url }
  const title = document.title?.split(/[-|–·•]/)[0]?.trim()
  data.businessName = title || undefined

  const metaDesc =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
  if (metaDesc) data.businessName = metaDesc.trim()

  const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || url

  if (sourceType === 'Facebook') data.facebookUrl = ogUrl
  if (sourceType === 'Instagram') data.instagramUrl = ogUrl
  if (sourceType === 'TikTok') data.tiktokUrl = ogUrl
  if (sourceType === 'YouTube') data.youtubeUrl = ogUrl
  if (sourceType === 'Twitter') data.xTwitterUrl = ogUrl
  if (sourceType === 'Threads') data.threadsUrl = ogUrl

  const bodyText = document.body?.innerText ?? ''
  const emails = extractEmails(bodyText)
  if (emails[0]) data.email = emails[0]
  const phones = extractPhones(bodyText)
  if (phones[0]) data.phone = phones[0]

  // Cross-link harvest on profile pages
  for (const a of document.querySelectorAll('a[href]')) {
    const href = (a as HTMLAnchorElement).href
    if (!data.website && /^https?:\/\//i.test(href) && !/(facebook|instagram|tiktok|youtube|twitter|x\.com|threads|linkedin)\./i.test(href)) {
      try {
        const u = new URL(href)
        if (!u.hostname.includes(window.location.hostname)) {
          data.website = href.split('?')[0]
          data.domain = extractDomain(href)
          data.hasWebsite = true
        }
      } catch { /* ignore */ }
    }
    if (!data.linkedinUrl && (LINKEDIN_COMPANY_RE.test(href) || LINKEDIN_PERSON_RE.test(href))) data.linkedinUrl = href
    if (!data.facebookUrl && FACEBOOK_RE.test(href)) data.facebookUrl = href
    if (!data.instagramUrl && INSTAGRAM_RE.test(href)) data.instagramUrl = href
    if (!data.tiktokUrl && TIKTOK_RE.test(href)) data.tiktokUrl = href
    if (!data.youtubeUrl && YOUTUBE_RE.test(href)) data.youtubeUrl = href
    if (!data.xTwitterUrl && TWITTER_RE.test(href)) data.xTwitterUrl = href
    if (!data.threadsUrl && THREADS_RE.test(href)) data.threadsUrl = href
  }

  return data
}

// ── Website (generic) ────────────────────────────────────────────────────────

function extractWebsite(url: string): ExtractedPageData {
  const data: ExtractedPageData = { sourceType: 'Website', sourceUrl: url }
  const bodyText = document.body?.innerText ?? ''
  const html     = document.documentElement?.innerHTML ?? ''

  data.domain     = extractDomain(url)
  data.website    = url.split('?')[0]
  data.hasWebsite = true

  const emails = extractEmails(bodyText)
  if (emails[0]) data.email = emails[0]

  const phones = extractPhones(bodyText)
  if (phones[0]) data.phone = phones[0]

  // Schema.org
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent ?? '') as Record<string, unknown>
      const items  = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [parsed]
      for (const item of items) {
        if (/LocalBusiness|Restaurant|Organization|Store/.test(String(item['@type'] ?? ''))) {
          if (item.name)      data.businessName = String(item.name)
          if (item.telephone) data.phone        = data.phone || String(item.telephone)
          if (item.email)     data.email        = data.email || String(item.email)
          const addr = item.address as Record<string, string> | undefined
          if (addr?.addressLocality) data.city    = addr.addressLocality
          if (addr?.streetAddress)   data.address = addr.streetAddress
          if (item['@type'])  data.category = String(item['@type'])
          break
        }
      }
    } catch { /* ignore */ }
  }

  if (!data.businessName) {
    data.businessName = document.title?.split(/[-|–·]/)[0]?.trim()
  }

  // Social links
  for (const a of document.querySelectorAll('a[href]')) {
    const href = (a as HTMLAnchorElement).href
    if (!data.linkedinUrl   && (LINKEDIN_COMPANY_RE.test(href) || LINKEDIN_PERSON_RE.test(href))) data.linkedinUrl   = href
    if (!data.facebookUrl   && FACEBOOK_RE.test(href))  data.facebookUrl   = href
    if (!data.instagramUrl  && INSTAGRAM_RE.test(href)) data.instagramUrl  = href
    if (!data.tiktokUrl     && TIKTOK_RE.test(href))    data.tiktokUrl     = href
    if (!data.youtubeUrl    && YOUTUBE_RE.test(href))   data.youtubeUrl    = href
    if (!data.xTwitterUrl   && TWITTER_RE.test(href))   data.xTwitterUrl   = href
    if (!data.threadsUrl    && THREADS_RE.test(href))   data.threadsUrl    = href
    if (!data.whatsappUrl   && WHATSAPP_RE.test(href))  data.whatsappUrl   = href
  }

  // Tech + signals
  data.technologyDetected = detectTech(html)
  data.hasChatWidget      = /intercom|tawk\.to|tidio|livechat|zendesk|drift|crisp|freshdesk/i.test(html)
  data.hasContactForm     = !!document.querySelector('form input[type="email"], form input[name*="email"]')
  data.hasOnlineOrdering  = /order online|add to cart|buy now|checkout|ubereats|deliveroo|just eat|doordash/i.test(html + bodyText)
  data.hasBookingSystem   = /book now|book a table|reservation|calendly|booksy|treatwell|opentable|fresha/i.test(html + bodyText)
  data.securitySignal     = url.startsWith('https') ? 'HTTPS enabled' : 'HTTP only'

  return data
}

function detectTech(html: string): string[] {
  const t: string[] = []
  if (/wp-content|wp-json|wordpress/i.test(html))     t.push('WordPress')
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(html)) t.push('Shopify')
  if (/woocommerce|wc-ajax/i.test(html))              t.push('WooCommerce')
  if (/wix\.com|wixsite/i.test(html))                 t.push('Wix')
  if (/webflow\.io|data-wf-site/i.test(html))         t.push('Webflow')
  if (/__NEXT_DATA__|_next\/static/i.test(html))      t.push('Next.js')
  if (/squarespace|static1\.squarespace/i.test(html)) t.push('Squarespace')
  if (/Mage\.Cookies|\/skin\/frontend/i.test(html))   t.push('Magento')
  return t
}
