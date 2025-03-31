import { sendEmail } from "./mailer";
import { verificationEmailTemplate } from "../template/emailVerification";
import { generateVerificationToken } from "./token";

export const sendVerificationEmail = async (email: string): Promise<void> => {
  const token = generateVerificationToken(email);
  const verifyUrl = `https://paystell.com/verify-email?token=${token}`;

  const emailBody = verificationEmailTemplate(email, verifyUrl);

  await sendEmail({
    to: email,
    subject: "Verify Your Email",
    html: emailBody,
  });
};
