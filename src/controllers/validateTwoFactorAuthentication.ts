import { verifyTwoFactorCode } from "../services/verifyTwoFactorCode";
import { User } from "../entities/User";
import { AppDataSource } from "../config/db";

export const validateTwoFactorAuthentication = async (
  userId: number,
  token: string,
) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: ["twoFactorAuth"],
  });

  if (!user || !user.twoFactorAuth || !user.twoFactorAuth.isEnabled) {
    throw new Error("2FA is not enabled for this user");
  }

  const isValid = verifyTwoFactorCode(token, user.twoFactorAuth.secret);
  if (!isValid) throw new Error("Invalid 2FA token");

  return true;
};
