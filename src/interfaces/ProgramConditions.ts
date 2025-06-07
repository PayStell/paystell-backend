export interface ProgramConditions {
  minimumTransactionAmount?: number
  requireKYC?: boolean
  maxReferrals?: number
  validityDays?: number
  allowedCountries?: string[]
  excludedCountries?: string[]
}