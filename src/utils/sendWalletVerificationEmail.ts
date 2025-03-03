import { sendEmail } from './mailer';
import { walletVerificationEmailTemplate } from '../template/wallet-verification.template';
import { generateVerificationToken } from './token';

/**
 * Sends a wallet verification email.
 * @param email The recipient's email address.
 * @param verificationCode The verification code.
 * @param walletAddress The Stellar wallet address being verified.
 */
export const sendWalletVerificationEmail = async (email: string, verificationCode: string, walletAddress: string): Promise<void> => {
  const token = generateVerificationToken(walletAddress);
  const verifyUrl = `https://paystell.com/verify-wallet?token=${token}`;

  const emailBody = walletVerificationEmailTemplate(email, verificationCode, walletAddress, verifyUrl);

  await sendEmail({
    to: email,
    subject: 'Verify Your Stellar Wallet',
    html: emailBody,
  });
};
