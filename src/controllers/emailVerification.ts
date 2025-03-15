import { Request, Response } from 'express';
import EmailVerificationService from '../services/emailVerification.service';

const emailVerificationService = new EmailVerificationService();


export const sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, userId } = req.body;

  if (!email || !userId) {
    res.status(400).json({ message: 'Email and userId are required' });
    return;
  }

  try {
    await emailVerificationService.sendVerificationEmail(email, userId);
    res.status(200).json({ message: 'Verification email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};


export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;

  if (!token) {
    res.status(400).json({ message: 'Token is required' });
    return;
  }

  try {
    await emailVerificationService.verifyEmail(token as string);
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};


export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  try {
    await emailVerificationService.resendVerificationEmail(email);
    res.status(200).json({ message: 'Verification email resent successfully' });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
