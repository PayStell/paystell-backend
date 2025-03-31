import { IsEmail, IsNotEmpty, IsOptional, Length } from "class-validator";
import { UserRole } from "../enums/UserRole";

export class CreateUserDTO {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @Length(6, 15) // password length between 6 and 15
  password!: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  walletAddress?: string;
}
