import dotenv from "dotenv";

dotenv.config();

const config = {
<<<<<<< HEAD
  STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL as string,
  SOROBAN_CONTRACT_ID: process.env.SOROBAN_CONTRACT_ID as string,
  STELLAR_SECRET_KEY: process.env.STELLAR_SECRET_KEY as string,
  STELLAR_NETWORK_PASSPHRASE: process.env.STELLAR_NETWORK_PASSPHRASE as string,
=======
  STELLAR_HORIZON_URL:
    process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
  SOROBAN_CONTRACT_ID: process.env.SOROBAN_CONTRACT_ID || "",
  STELLAR_SECRET_KEY: process.env.STELLAR_SECRET_KEY || "",
  STELLAR_NETWORK_PASSPHRASE:
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
>>>>>>> a7bf88e5e90b13b619038597690907d8b98b32bb
};

export default config;
