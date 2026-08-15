// Chart color tokens. The stacked-segment orderings used in this app were
// validated with the dataviz palette validator (CVD separation, lightness
// band, normal-vision floor) against the light card surface:
//   good→accent→attention→risk   (gap-status)      — PASS
//   good→accent→attention→recapture (value comp)   — PASS
// `neutral` is a de-emphasis remainder/track tone, never a categorical slot.
// Contrast relief for good/attention (<3:1 vs surface): every stacked chart
// renders a legend with values, and each page keeps a table view.

export const CHART = {
  accent: '#2563EB',
  accentSoft: '#93C5FD', // "before" in dumbbells — lighter step of the accent hue
  accentDark: '#1D4ED8', // "after" in dumbbells
  good: '#10B981',
  attention: '#F59E0B',
  risk: '#F43F5E',
  recapture: '#8B5CF6',
  neutral: '#94A3B8',
  track: '#E2E8F0',
  grid: '#E2E8F0',
  surface: '#FFFFFF'
} as const;

export const GAP_STATUS_COLORS: Record<string, string> = {
  'closed-claims': CHART.good,
  'closed-clinical': CHART.accent,
  'open-needs-clinical': CHART.attention,
  'open-needs-document': CHART.risk
};

export const GAP_STATUS_LABELS: Record<string, string> = {
  'closed-claims': 'Closed by claims',
  'closed-clinical': 'Closed by clinical data',
  'open-needs-clinical': 'Open · needs clinical data',
  'open-needs-document': 'Open · needs document'
};
