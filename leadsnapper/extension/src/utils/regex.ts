export const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g

export const PHONE_RE = new RegExp(
  [
    '(\\+44[\\s\\-\\(\\)\\d]{8,14})',  // UK international
    '(0[12378][0-9][\\s\\-\\(\\)\\d]{7,11})', // UK local
    '(\\+1[\\s\\-\\(\\)\\d]{9,13})',   // USA international
    '(\\(\\d{3}\\)[\\s\\-]\\d{3}[\\-]\\d{4})', // USA (XXX) XXX-XXXX
    '(\\d{3}[\\s\\-\\.][\\d]{3}[\\s\\-\\.]\\d{4})', // USA XXX-XXX-XXXX
  ].join('|'),
  'g'
)

export const LINKEDIN_COMPANY_RE = /linkedin\.com\/company\/[a-zA-Z0-9\-_%]+/
export const LINKEDIN_PERSON_RE  = /linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/
export const FACEBOOK_RE         = /facebook\.com\/(?!sharer|share|l\.php)[a-zA-Z0-9.\-_/]+/
export const INSTAGRAM_RE        = /instagram\.com\/[a-zA-Z0-9._]+/
export const TIKTOK_RE           = /tiktok\.com\/@[a-zA-Z0-9._]+/
export const YOUTUBE_RE          = /youtube\.com\/(channel|c|@|user)\/[a-zA-Z0-9._\-]+/
export const TWITTER_RE          = /(?:twitter|x)\.com\/[a-zA-Z0-9_]+/
export const THREADS_RE          = /threads\.net\/@[a-zA-Z0-9._]+/
export const WHATSAPP_RE         = /(?:wa\.me\/|whatsapp\.com\/send\?phone=)\+?[0-9]+/

export function extractEmails(text: string): string[] {
  return [...new Set((text.match(EMAIL_RE) ?? []).filter(e => !isInternalEmail(e)))]
}

export function extractPhones(text: string): string[] {
  const raw = text.match(PHONE_RE) ?? []
  return [...new Set(raw.map(p => p.replace(/\s+/g, ' ').trim()))].slice(0, 3)
}

export function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      .replace(/^www\./, '')
  } catch {
    return ''
  }
}

function isInternalEmail(email: string): boolean {
  const blocked = ['example.com', 'test.com', 'domain.com', 'email.com', 'yoursite.com']
  return blocked.some(d => email.endsWith(d))
}
