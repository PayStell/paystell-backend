import { IsString, Length } from "class-validator";
import { IsStellarAddress } from "../validators/IsStellarAddress";

export class InitiateWalletVerificationDto {
  @IsString()
  userId: string;

  @IsString()
  @IsStellarAddress()
  walletAddress: string;
}

export class VerifyWalletDto {
  @IsString()
  token: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
