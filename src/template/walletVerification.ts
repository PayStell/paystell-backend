export const walletVerificationTemplate = (code: string, walletAddress: string) => `
    <h2>Stellar Wallet Verification</h2>
    <p>You have requested to link the following wallet to your account:</p>
    <p><strong>${walletAddress}</strong></p>
    <p>Your verification code is:</p>
    <h1>${code}</h1>
    <p>This code will expire in 24 hours.</p>
    <p>If you did not request this verification, please ignore this email.</p>
`;
