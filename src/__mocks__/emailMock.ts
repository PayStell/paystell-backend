export const emailMock = {
    sendEmail: jest.fn().mockResolvedValue({ messageId: '5678' }),
  };