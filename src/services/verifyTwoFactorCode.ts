import * as speakeasy from "speakeasy";

export const verifyTwoFactorCode = (token: string, secret: string): boolean => {
    if (!secret) {
        return false;  // Si no hay secreto, no puede ser válido
    }
    return speakeasy.totp.verify({
        secret,  // El secreto almacenado en la base de datos
        encoding: "base32",  // El formato en el que se almacena el secreto
        token,  // El código proporcionado por el usuario
        window: 1,
    });
};
