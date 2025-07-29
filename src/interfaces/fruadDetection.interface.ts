export interface SuspiciousIPResult {
  ip: string;
  count: string;
}

export interface SuspiciousUserResult {
  userId: string;
  count: string;
}

export interface SuspiciousActivity {
  ip: string;
  throttledCount: number;
}

export interface SuspiciousUser {
  userId: string;
  throttledCount: number;
}

export interface RiskIndicators {
  highRiskIPs: number;
  highRiskUsers: number;
  averageThrottlePerIP: number;
  averageThrottlePerUser: number;
}

export interface RateLimitFraudStats {
  period: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  totalEvents: number;
  throttledEvents: number;
  burstEvents: number;
  throttleRate: number;
  burstRate: number;
  suspiciousActivity: {
    suspiciousIPs: SuspiciousActivity[];
    suspiciousUsers: SuspiciousUser[];
  };
  riskIndicators: RiskIndicators;
}
