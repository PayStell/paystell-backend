import dotenv from "dotenv";

dotenv.config();

const config = {
  STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL as string,
  SOROBAN_CONTRACT_ID: process.env.SOROBAN_CONTRACT_ID as string,
  STELLAR_SECRET_KEY: process.env.STELLAR_SECRET_KEY as string,
  STELLAR_NETWORK_PASSPHRASE: process.env.STELLAR_NETWORK_PASSPHRASE as string,
};

export default config;
