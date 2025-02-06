import { User } from "../entities/User";
import { TwoFactorAuth } from "../entities/TwoFactorAuth";
import { generateTwoFactorSecret } from "../services/generateTwoFactorSecret";
import AppDataSource from "../config/db";

export const enableTwoFactorAuthentication = async (userId: number) => {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
        where: { id: userId },
        relations: ["twoFactorAuth"]
    });

    if (!user) throw new Error("User not found");


    const secret = generateTwoFactorSecret(user.email);

    if (!user.twoFactorAuth) {
        user.twoFactorAuth = new TwoFactorAuth();
        user.twoFactorAuth.user = user;  // 🔹 Asegurar la relación con el usuario
    }

    // Asigna el secreto generado sin cifrarlo
    user.twoFactorAuth.secret = secret.base32;
    user.twoFactorAuth.isEnabled = true;

    // Guarda correctamente la relación
    await AppDataSource.getRepository(TwoFactorAuth).save(user.twoFactorAuth);

    return { qrCode: secret.otpauth_url, secret: secret.base32 };
};


export const disableTwoFactorAuthentication = async (userId: number) => {
    const userRepository = AppDataSource.getRepository(User);
    const twoFactorRepository = AppDataSource.getRepository(TwoFactorAuth);

    const user = await userRepository.findOne({
        where: { id: userId },
        relations: ["twoFactorAuth"]
    });

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.isEnabled) {
        throw new Error("2FA is not enabled for this user");
    }

    // Desactiva 2FA correctamente
    user.twoFactorAuth.isEnabled = false;
    user.twoFactorAuth.secret = "";

    await twoFactorRepository.save(user.twoFactorAuth); // Guardar cambios en TwoFactorAuth

    return { message: "2FA disabled successfully" };
};
