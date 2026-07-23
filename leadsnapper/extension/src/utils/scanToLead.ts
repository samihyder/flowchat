import { v4 as uuidv4 } from 'uuid'
import type { Lead, SearchConfig } from '../types/lead'
import type { ScanLead } from '../types/scan'
import { extractDomain } from './regex'

export function scanToLead(scan: ScanLead, searchConfig: SearchConfig): Lead {
  const e  = scan.enriched
  const b2b = scan.exploriumData
  const website = scan.websiteUrl || e?.gmbWebsiteUrl
  const domain  = scan.domain || (website ? extractDomain(website) : undefined)

  const ownerName = b2b?.ownerName || scan.ownerName || e?.ownerName
  const ownerLi   = b2b?.ownerLinkedin || scan.ownerLinkedinUrl || e?.ownerLinkedinUrl || e?.social?.linkedinPerson
  const businessLinkedin = e?.social?.linkedinCompany
  const businessPhone = e?.primaryPhone || scan.phone || e?.gmbPhone || e?.schemaPhone
  const ownerPhone = b2b?.ownerPhone || e?.ownerPhone
  const ownerMobile = b2b?.ownerMobile

  return {
    leadId: uuidv4(),
    captureDate: scan.captureDate,
    captureTime: scan.captureTime,
    sourceType: scan.sourceType,
    sourceUrl: scan.sourceUrl,
    searchKeyword: scan.searchQuery,
    searchQueryUsed: scan.searchQuery,
    googleRank: scan.googleRank,

    targetMarket: searchConfig.targetMarket,
    country: scan.country || searchConfig.country,
    regionOrState: searchConfig.regionOrState,
    county: searchConfig.county,
    city: scan.city || e?.gmbCity || searchConfig.city,
    area: searchConfig.area,
    postalOrZipCode: searchConfig.postalOrZipCode,
    complianceRegion: searchConfig.complianceRegion,

    businessName: scan.businessName,
    website,
    domain,
    industry: searchConfig.industry,
    category: scan.category || e?.gmbCategory,
    address: scan.address || e?.gmbAddress,
    phone: businessPhone,
    email: b2b?.ownerEmail || b2b?.ownerPersonalEmail || e?.primaryEmail,

    linkedinUrl: businessLinkedin,
    facebookUrl: e?.social?.facebook,
    instagramUrl: e?.social?.instagram,
    tiktokUrl: e?.social?.tiktok,
    youtubeUrl: e?.social?.youtube,
    xTwitterUrl: e?.social?.xTwitter,
    whatsappUrl: e?.whatsappUrl,

    googleRating: scan.googleRating ?? e?.gmbRating,
    googleReviews: scan.googleReviews ?? e?.gmbReviews,
    openingHours: e?.gmbOpeningHours,

    technologyDetected: e?.techStack,
    hasWebsite: !!website,
    hasContactForm: e?.hasContactForm,
    hasChatWidget: e?.hasChatWidget,
    hasOnlineOrdering: e?.hasOnlineOrdering,
    hasBookingSystem: e?.hasBookingSystem,
    securitySignal: e?.securitySignal,

    ownerName,
    directorName: scan.directorName || ownerName,
    decisionMakerLinkedin: ownerLi,
    ownerDataConfidence: scan.verified || scan.ownerVerified ? 'High' : ownerName ? 'Medium' : 'Low',

    brandFit: scan.brandFit || searchConfig.brandFit || '',
    serviceFit: scan.serviceFit?.length ? scan.serviceFit : (searchConfig.serviceFit ?? []),
    leadScore: scan.leadScore,
    leadPriority: scan.leadPriority,
    leadStatus: scan.verified ? 'Verified' : 'New',

    assignedTo: undefined,
    notes: scan.userNotes,
    nextAction: scan.leadPriority === 'Hot' ? 'Call' : undefined,
    outreachBasis: 'Legitimate Interest - B2B',
    optOutStatus: 'Active',
    doNotContact: false,
    crmSyncStatus: 'not_synced',

    // Extended export fields
    primaryEmail: e?.primaryEmail,
    allEmails: e?.emails,
    allPhones: e?.phones,
    ownerTitle: b2b?.ownerTitle || e?.ownerTitle,
    ownerPhone,
    ownerMobile,
    ownerWorkEmail: b2b?.ownerEmail,
    ownerPersonalEmail: b2b?.ownerPersonalEmail,
    b2bSource: b2b?.source,
    mobileSource: b2b?.mobileSource,
    companiesHouseMatched: b2b?.companiesHouseMatched,
    gmbWebsite: e?.gmbWebsiteUrl,
    gmbPhone: e?.gmbPhone,
    gmbAddress: e?.gmbAddress,
    gmbCategory: e?.gmbCategory,
    gmbOpeningHours: e?.gmbOpeningHours,
    gmbDescription: e?.gmbDescription,
    gmbRating: e?.gmbRating,
    gmbReviews: e?.gmbReviews,
    chatWidgetProvider: e?.chatWidgetProvider,
    hasWhatsApp: e?.hasWhatsApp,
    orderPageUrl: e?.orderPageUrl,
    bookingUrl: e?.bookingUrl,
    hasNewsletter: e?.hasNewsletter,
    hasCareersPage: e?.hasCareersPage,
    hasPrivacyPolicy: e?.hasPrivacyPolicy,
    metaTitle: e?.metaTitle,
    metaDescription: e?.metaDescription,
    socialPresenceScore: e?.socialPresenceScore,
    businessListings: e?.businessListings,
    companyNumberFound: e?.companyNumberFound || scan.companyNumber,
    mentionsTrademark: e?.mentionsTrademark,
    mentionsDuns: e?.mentionsDuns,
    mentionsCompanyReg: e?.mentionsCompanyReg,
    googleMapsUrl: scan.googleMapsUrl,
    openStatus: scan.openStatus,
    priceRange: scan.priceRange,
    teamMembersJson: e?.teamMembers?.length
      ? JSON.stringify(e.teamMembers)
      : undefined,
    userVerified: scan.verified,
  }
}
