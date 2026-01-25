// Mapping for role categories and experience ranges

export const ROLE_CATEGORY_LABELS: Record<string, string> = {
  ETRM_BA: 'ETRM Business Analyst',
  ETRM_DEV: 'ETRM Developer',
  ETRM_TESTER: 'ETRM Tester',
  TRADING_INFRA: 'Trading Infrastructure',
  DATA_INTEGRATION: 'Data Integration',
  QUANT_ANALYST: 'Quantitative Analyst',
  OTHER: 'Other',
  // Legacy
  BA: 'Business Analyst',
  DEV: 'Developer',
  OPS: 'Operations',
  RISK: 'Risk',
  TRADING: 'Trading',
  COMPLIANCE: 'Compliance',
}

export const EXPERIENCE_RANGE_LABELS: Record<string, string> = {
  JUNIOR: '0-2 years',
  MID: '2-5 years',
  SENIOR: '5+ years',
}

export function getExperienceRange(seniority: string): string {
  return EXPERIENCE_RANGE_LABELS[seniority] || seniority
}

export function getRoleLabel(roleCategory: string): string {
  return ROLE_CATEGORY_LABELS[roleCategory] || roleCategory
}