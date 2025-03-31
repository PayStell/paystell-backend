const nodemailer = {
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mocked-message-id" }),
  }),
};

console.log("Using mocked nodemailer");

export default nodemailer;
