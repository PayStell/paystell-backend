import nacl from "tweetnacl";
import { Buffer } from "buffer";
import config from "../config/stellarConfig";

export function generateSignature(
  payerAddress: string,
  merchantAddress: string,
  amount: number,
  tokenAddress: string,
  orderId: string,
  expiration: number,
  nonce: string
) {
  const data = `${payerAddress}${merchantAddress}${amount}${tokenAddress}${orderId}${expiration}${nonce}`;
  const secretKey = Buffer.from(config.STELLAR_SECRET_KEY, "hex");
  const keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
  const signature = nacl.sign.detached(Buffer.from(data), keyPair.secretKey);
  return Buffer.from(signature).toString("hex");
}