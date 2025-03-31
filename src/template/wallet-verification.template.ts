import { baseEmailLayout } from "./layout";

export const walletVerificationEmailTemplate = (
  verificationCode: string,
  walletAddress: string,
  verifyUrl: string,
): string => {
  const header = `<h2>Verify Your Stellar Wallet</h2>`;
  const content = `
    <p>You requested to link the following Stellar wallet to your PayStell account:</p>
    <p><strong>${walletAddress}</strong></p>
    <p>Your verification code is:</p>
    <h1 style="text-align: center; font-size: 24px;">${verificationCode}</h1>
    <p>This code will expire in 24 hours.</p>
    <p>Alternatively, you can verify your wallet by clicking the button below:</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" style="background-color: #079eff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 16px;">Verify Wallet</a>
    </p>
    <p>If you did not request this verification, please ignore this email.</p>
  `;

  return baseEmailLayout(header, content);
};
