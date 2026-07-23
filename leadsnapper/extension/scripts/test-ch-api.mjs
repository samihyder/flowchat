#!/usr/bin/env node
/**
 * Companies House API connectivity test.
 * Usage: CH_API_KEY=your-key node scripts/test-ch-api.mjs
 * Without a key, verifies the API returns 401 (reachable, auth required).
 */

const BASE = 'https://api.company-information.service.gov.uk'
const key = process.env.CH_API_KEY?.trim()

function formatAddress(addr) {
  return [
    addr.premises,
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country,
  ].filter(Boolean).join(', ')
}

async function main() {
  console.log('Companies House API test\n')

  if (!key) {
    const res = await fetch(`${BASE}/search/companies?q=test&items_per_page=1`)
    const body = await res.text()
    console.log(`No CH_API_KEY — unauthenticated probe: ${res.status}`)
    console.log(body.slice(0, 120))
    if (res.status === 401) {
      console.log('\n✓ API reachable — add CH_API_KEY to run full test')
      process.exit(0)
    }
    console.error('\n✗ Unexpected response')
    process.exit(1)
  }

  const auth = `Basic ${Buffer.from(`${key}:`).toString('base64')}`
  const headers = { Authorization: auth }

  const searchRes = await fetch(`${BASE}/search/companies?q=Tesco&items_per_page=1`, { headers })
  if (!searchRes.ok) {
    console.error(`Search failed: ${searchRes.status}`, await searchRes.text())
    process.exit(1)
  }
  const search = await searchRes.json()
  const company = search.items?.[0]
  if (!company?.company_number) {
    console.error('No company in search results')
    process.exit(1)
  }
  console.log(`Search:   ✓ ${company.title} (${company.company_number})`)

  const num = company.company_number

  const officersRes = await fetch(`${BASE}/company/${num}/officers?items_per_page=5`, { headers })
  if (!officersRes.ok) {
    console.error(`Officers failed: ${officersRes.status}`)
    process.exit(1)
  }
  const officers = await officersRes.json()
  const director = officers.items?.find(o => !o.resigned_on && o.officer_role === 'director') ?? officers.items?.[0]
  console.log(director ? `Officers: ✓ ${director.name} (${director.officer_role})` : 'Officers: — none')

  const pscRes = await fetch(`${BASE}/company/${num}/persons-with-significant-control?items_per_page=3`, { headers })
  if (!pscRes.ok) {
    console.error(`PSC failed: ${pscRes.status}`)
    process.exit(1)
  }
  const psc = await pscRes.json()
  const individual = psc.items?.find(p => !p.ceased_on && p.kind?.includes('individual'))
  console.log(individual?.name ? `PSC:      ✓ ${individual.name}` : 'PSC:      — none')

  const addrRes = await fetch(`${BASE}/company/${num}/registered-office-address`, { headers })
  if (!addrRes.ok) {
    console.error(`Address failed: ${addrRes.status}`)
    process.exit(1)
  }
  const addr = await addrRes.json()
  const formatted = formatAddress(addr)
  console.log(formatted ? `Address:  ✓ ${formatted}` : 'Address:  — empty')

  console.log('\n✓ All four endpoints OK')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
