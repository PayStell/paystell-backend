import { sendEmail } from "../utils/mailer";
import nodemailer from "nodemailer";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mocked-message-id" }),
  }),
}));

describe("Mailer Utility", () => {
  it("should send an email successfully", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email",
      html: "<p>Hello, World!</p>",
    });

    expect(result).toHaveProperty("messageId");
    expect(result.messageId).toBe("mocked-message-id");
  });

  it("should throw an error if email fails to send", async () => {
    const transport = nodemailer.createTransport();

    (transport.sendMail as jest.Mock).mockRejectedValueOnce(
      new Error("Send failed"),
    );

    await expect(
      sendEmail({
        to: "test@example.com",
        subject: "Test Email",
        html: "<p>Hello, World!</p>",
      }),
    ).rejects.toThrow("Send failed");
  });
});
