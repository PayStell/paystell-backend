-- Insert a default referral program
INSERT INTO referral_programs (
    name,
    description,
    referrer_reward,
    referee_reward,
    reward_currency,
    conditions,
    start_date,
    status,
    max_rewards_per_user,
    total_budget
) VALUES (
    'PayStell Launch Referral Program',
    'Earn rewards for referring friends to PayStell. Both you and your friend get rewarded!',
    10.00,
    5.00,
    'USD',
    '{"minimumTransactionAmount": 50, "requireKYC": true, "validityDays": 30, "maxReferrals": 100}',
    CURRENT_TIMESTAMP,
    'active',
    50,
    10000.00
) ON CONFLICT DO NOTHING;
