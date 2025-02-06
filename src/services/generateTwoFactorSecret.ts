import * as speakeasy from "speakeasy";

export const generateTwoFactorSecret = (email: string) => {
    return speakeasy.generateSecret({ name: `Paystell (${email})` });
};
