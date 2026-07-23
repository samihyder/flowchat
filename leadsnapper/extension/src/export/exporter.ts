import * as XLSX from 'xlsx'
import type { Lead, SearchConfig } from '../types/lead'

function fmt(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function leadToRow(lead: Lead): Record<string, string> {
  return {
    'Lead ID': lead.leadId,
    'Capture Date': lead.captureDate,
    'Capture Time': lead.captureTime,
    'Source Type': lead.sourceType,
    'Source URL': lead.sourceUrl,
    'Search Keyword': fmt(lead.searchKeyword),
    'Google Rank': fmt(lead.googleRank),
    'Lead Score': String(lead.leadScore),
    'Priority': lead.leadPriority,
    'Lead Status': lead.leadStatus,

    'Business Name': fmt(lead.businessName),
    'Category': fmt(lead.category),
    'Website': fmt(lead.website),
    'Domain': fmt(lead.domain),
    'Google Maps URL': fmt(lead.googleMapsUrl),

    'Address': fmt(lead.address),
    'City': fmt(lead.city),
    'Country': fmt(lead.country),
    'Target Market': fmt(lead.targetMarket),
    'Compliance Region': fmt(lead.complianceRegion),

    'Phone': fmt(lead.phone),
    'Email': fmt(lead.email),
    'Primary Email': fmt(lead.primaryEmail),
    'All Emails': fmt(lead.allEmails),
    'All Phones': fmt(lead.allPhones),
    'WhatsApp URL': fmt(lead.whatsappUrl),
    'Has WhatsApp': fmt(lead.hasWhatsApp),

    'LinkedIn URL': fmt(lead.linkedinUrl),
    'Facebook URL': fmt(lead.facebookUrl),
    'Instagram URL': fmt(lead.instagramUrl),
    'Social Presence Score': fmt(lead.socialPresenceScore),

    'Google Rating': fmt(lead.googleRating),
    'Google Reviews': fmt(lead.googleReviews),
    'Opening Status': fmt(lead.openStatus),
    'Price Range': fmt(lead.priceRange),
    'Opening Hours': fmt(lead.openingHours),

    'GMB Website': fmt(lead.gmbWebsite),
    'GMB Phone': fmt(lead.gmbPhone),
    'GMB Address': fmt(lead.gmbAddress),
    'GMB Category': fmt(lead.gmbCategory),
    'GMB Opening Hours': fmt(lead.gmbOpeningHours),
    'GMB Description': fmt(lead.gmbDescription),
    'GMB Rating': fmt(lead.gmbRating),
    'GMB Reviews': fmt(lead.gmbReviews),

    'Technology Stack': fmt(lead.technologyDetected),
    'Chat Widget': fmt(lead.chatWidgetProvider ?? lead.hasChatWidget),
    'Has Contact Form': fmt(lead.hasContactForm),
    'Has Online Ordering': fmt(lead.hasOnlineOrdering),
    'Order Page URL': fmt(lead.orderPageUrl),
    'Has Booking System': fmt(lead.hasBookingSystem),
    'Booking URL': fmt(lead.bookingUrl),
    'Has Newsletter': fmt(lead.hasNewsletter),
    'Has Careers Page': fmt(lead.hasCareersPage),
    'Has Privacy Policy': fmt(lead.hasPrivacyPolicy),
    'Security Signal': fmt(lead.securitySignal),
    'Meta Title': fmt(lead.metaTitle),
    'Meta Description': fmt(lead.metaDescription),

    'Business Listings': fmt(lead.businessListings),
    'Company Number': fmt(lead.companyNumberFound),
    'Company Reg Mentioned': fmt(lead.mentionsCompanyReg),
    'Trademark Mentioned': fmt(lead.mentionsTrademark),
    'DUNS Mentioned': fmt(lead.mentionsDuns),

    'Owner Name': fmt(lead.ownerName),
    'Owner Title': fmt(lead.ownerTitle),
    'Owner Mobile': fmt(lead.ownerMobile),
    'Owner Work Email': fmt(lead.ownerWorkEmail),
    'Owner Personal Email': fmt(lead.ownerPersonalEmail),
    'Owner LinkedIn': fmt(lead.decisionMakerLinkedin),
    'Director Name': fmt(lead.directorName),
    'B2B Source': fmt(lead.b2bSource),
    'Team Members': fmt(lead.teamMembersJson),
    'Verified by User': fmt(lead.userVerified),

    'Brand Fit': lead.brandFit,
    'Service Fit': fmt(lead.serviceFit),
    'Assigned To': fmt(lead.assignedTo),
    'Notes': fmt(lead.notes),
    'Next Action': fmt(lead.nextAction),
    'Follow-up Date': fmt(lead.followUpDate),
    'Outreach Basis': lead.outreachBasis,
    'Opt-out Status': lead.optOutStatus,
    'Do Not Contact': fmt(lead.doNotContact),
    'Suppression Reason': fmt(lead.suppressionReason),
  }
}

function leadsForBrand(leads: Lead[], brandName: string): Lead[] {
  return leads.filter(l => l.brandFit === brandName || l.brandFit === 'Both')
}

export function exportToExcel(leads: Lead[], searchConfig?: SearchConfig, brandNames?: string[]): void {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`
  const batchId = `batch_${dateStr}_${timeStr}`

  const exportLeads = leads.map(l => ({ ...l, exportBatchId: batchId }))
  const wb = XLSX.utils.book_new()

  const leadsData = exportLeads.map(leadToRow)
  const ws1 = XLSX.utils.json_to_sheet(leadsData)
  styleHeaderRow(ws1, Object.keys(leadsData[0] ?? {}))
  ws1['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws1, 'Leads')

  const summaryRows = [
    ['Export Date', dateStr],
    ['Export Time', timeStr],
    ['Batch ID', batchId],
    ['Total Leads', String(exportLeads.length)],
    ['Hot', String(exportLeads.filter(l => l.leadPriority === 'Hot').length)],
    ['Warm', String(exportLeads.filter(l => l.leadPriority === 'Warm').length)],
    ['Cold', String(exportLeads.filter(l => l.leadPriority === 'Cold').length)],
    ...(brandNames?.length
      ? brandNames.map(name => [name, String(leadsForBrand(exportLeads, name).length)])
      : [...new Set(exportLeads.map(l => l.brandFit).filter(Boolean))].map(name =>
          [name, String(leadsForBrand(exportLeads, name).length)]
        )
    ),
    [],
    ['Search Configuration'],
    ['Target Market', searchConfig?.targetMarket ?? ''],
    ['Country', searchConfig?.country ?? ''],
    ['City', searchConfig?.city ?? ''],
    ['Keyword', searchConfig?.keyword ?? ''],
    ['Brand Fit', searchConfig?.brandFit ?? ''],
    ['Service Fit', searchConfig?.serviceFit?.join(', ') ?? ''],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows)
  ws2['!cols'] = [{ wch: 22 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  XLSX.writeFile(wb, `LeadSnapper_Pipeline_${dateStr}_${timeStr}.xlsx`)
}

function styleHeaderRow(ws: XLSX.WorkSheet, headers: string[]): void {
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }))
}
