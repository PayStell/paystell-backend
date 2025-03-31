import * as speakeasy from "speakeasy";

export const verifyTwoFactorCode = (token: string, secret: string): boolean => {
  if (!secret) {
    return false; // If there's no secret, it can't be valid
  }
  return speakeasy.totp.verify({
    secret, // The secret stored in the database
    encoding: "base32", // The format in which the secret is stored
    token, // The code provided by the user
    window: 1,
  });
};
