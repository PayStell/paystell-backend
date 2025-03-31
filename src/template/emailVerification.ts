import { baseEmailLayout } from "./layout";

export const verificationEmailTemplate = (
  email: string,
  verifyUrl: string,
): string => {
  const header = `
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
  `;

  const content = `
    <p>Hi ${email},</p>
    <p>Thank you for registering with PayStell! Please verify your email address by clicking the button below:</p>
    <a href="${verifyUrl}" style="
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #079eff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
    ">Verify Email</a>
    <p>If you did not sign up for PayStell, please ignore this email.</p>
  `;

  return baseEmailLayout(header, content);
};
