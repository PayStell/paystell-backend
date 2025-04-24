export interface UserRegistrationData {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isWalletVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  twoFactorAuth?: {
    isEnabled: boolean;
  };
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface JWTPayload {
  id: number;
  email: string;
  jti?: string; // JWT ID for token identification
  iat?: number;
  exp?: number;
}

export interface Auth0Profile {
  sub?: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updated_at?: string;

  at_hash?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  iss?: string;
  nonce?: string;
}
