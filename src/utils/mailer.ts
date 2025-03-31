import { createTransporter } from "../config/mailConfig";
import { SentMessageInfo } from "nodemailer";

interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (
  options: EmailOptions,
): Promise<SentMessageInfo> => {
  const transporter = createTransporter();

  const mailOptions = {
    from: options.from || `"PayStell" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
