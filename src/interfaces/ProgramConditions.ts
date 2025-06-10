/**
 * Configuration interface for referral program conditions and constraints
 */
export interface ProgramConditions {
  /** Minimum transaction amount required to trigger referral rewards */
   minimumTransactionAmount?: number
  /** Whether KYC verification is required for referral participants */
   requireKYC?: boolean
  /** Maximum number of referrals allowed per user */
   maxReferrals?: number
  /** Number of days the referral remains valid */
   validityDays?: number
  /** Array of ISO 3166-1 alpha-2 country codes where program is available */
   allowedCountries?: string[]
  /** Array of ISO 3166-1 alpha-2 country codes excluded from program */
   excludedCountries?: string[]
 }