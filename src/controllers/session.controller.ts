import { Request, Response } from "express";
import SessionService from "../services/session.service";

export const createSession = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.body;
    const session = await SessionService.createSession(userId);
    return res.status(201).json(session);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<Response> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("Token missing") // check if token is in the headers

    await SessionService.deleteSession(token);
    return res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
};
