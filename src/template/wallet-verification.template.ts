export const walletVerificationEmailTemplate = (email: string, verificationCode: string, walletAddress: string, verifyUrl: string) => `
    <h2>Verify Your Stellar Wallet</h2>
    <p>Hello ${email},</p>
    <p>You requested to link the following Stellar wallet to your Paystell account:</p>
    <p><strong>${walletAddress}</strong></p>
    <p>Your verification code is:</p>
    <h1>${verificationCode}</h1>
    <p>This code will expire in 24 hours.</p>
    <p>Alternatively, you can verify your wallet by clicking the button below:</p>
    <p><a href="${verifyUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Verify Wallet</a></p>
    <p>If you did not request this verification, please ignore this email.</p>
`;
