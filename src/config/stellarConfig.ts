import dotenv from "dotenv";

dotenv.config();

const config = {
  STELLAR_HORIZON_URL:
    process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
  SOROBAN_CONTRACT_ID: process.env.SOROBAN_CONTRACT_ID || "",
  STELLAR_SECRET_KEY: process.env.STELLAR_SECRET_KEY || "",
  STELLAR_NETWORK_PASSPHRASE:
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
};

export default config;
