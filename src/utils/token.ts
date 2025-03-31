import jwt from "jsonwebtoken";

const TOKEN_SECRET = process.env.TOKEN_SECRET || "your_secret_key";

export const generateVerificationToken = (email: string): string => {
  return jwt.sign({ email }, TOKEN_SECRET, { expiresIn: "24h" });
};

export const verifyToken = (token: string): { email: string } => {
  return jwt.verify(token, TOKEN_SECRET) as { email: string };
};
