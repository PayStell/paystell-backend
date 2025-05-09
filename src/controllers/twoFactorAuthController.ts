import { User } from "../entities/User";
import { TwoFactorAuth } from "../entities/TwoFactorAuth";
import { generateTwoFactorSecret } from "../services/generateTwoFactorSecret";
import { AppDataSource } from "../config/db";
import { validateTwoFactorAuthentication } from "./validateTwoFactorAuthentication";

export const enableTwoFactorAuthentication = async (userId: number) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: ["twoFactorAuth"],
  });
  if (!user) throw new Error("User not found");
  const secret = generateTwoFactorSecret(user.email);
  if (!user.twoFactorAuth) {
    user.twoFactorAuth = new TwoFactorAuth();
    user.twoFactorAuth.user = user; // Ensure the relationship with the user
  }
  // Assign the generated secret without encrypting it
  user.twoFactorAuth.secret = secret.base32;
  user.twoFactorAuth.isEnabled = true;
  // Save the relationship correctly
  await AppDataSource.getRepository(TwoFactorAuth).save(user.twoFactorAuth);
  return { qrCode: secret.otpauth_url, secret: secret.base32 };
};

export const disableTwoFactorAuthentication = async (userId: number) => {
  const userRepository = AppDataSource.getRepository(User);
  const twoFactorRepository = AppDataSource.getRepository(TwoFactorAuth);
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: ["twoFactorAuth"],
  });
  if (!user || !user.twoFactorAuth || !user.twoFactorAuth.isEnabled) {
    throw new Error("2FA is not enabled for this user");
  }
  // Disable 2FA correctly
  user.twoFactorAuth.isEnabled = false;
  user.twoFactorAuth.secret = "";
  await twoFactorRepository.save(user.twoFactorAuth); // Save changes in TwoFactorAuth
  return { message: "2FA disabled successfully" };
};

export const verifyTwoFactorAuthentication = async (
  userId: number,
  token: string,
) => {
  try {
    await validateTwoFactorAuthentication(userId, token);
    return { success: true, message: "2FA verification successful" };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Error verifying 2FA token",
    );
  }
};
