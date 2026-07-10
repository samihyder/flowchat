/**
 * Mutex Systems ecosystem brand colors (shared across FlowChat,
 * wa-automation, and LeadMonitor). Matches wa-automation app icon:
 * turquoise #2DD4BF → aqua #06B6D4 gradient.
 */
export const MUTEX_BRAND = {
  turquoise: '#2DD4BF',
  aqua: '#06B6D4',
  aquaDark: '#0891B2',
  aquaDarker: '#0E7490',
  aquaDeep: '#155E75',
  sidebarBg: '#134E4A',
  sidebarHover: '#115E59',
  heading: '#0F766E',
  gradient: 'linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)',
  /** Default primary for widgets, labels, charts, and CTAs */
  primary: '#06B6D4',
} as const;

export const MUTEX_PRIMARY_DEFAULT = MUTEX_BRAND.primary;
