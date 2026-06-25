/** Canonical marketing module URLs (Stitch shell — separate from dashboard). */
export const marketingRoutes = {
  home: '/marketing/campaigns',
  campaigns: '/marketing/campaigns',
  campaignsNew: '/marketing/campaigns/new',
  campaign: (id: string) => `/marketing/campaigns/${id}`,
  campaignEdit: (id: string, step?: number) =>
    `/marketing/campaigns/${id}/edit${step != null ? `?step=${step}` : ''}`,
  templates: '/marketing/templates',
  templateNew: '/marketing/templates/new',
  templateEdit: (id: string) => `/marketing/templates/${id}/edit`,
  segments: '/marketing/segments',
} as const;
