import { body } from "express-validator";

export const validatePayment = [
  body("payerAddress").isString(),
  body("merchantAddress").isString(),
  body("amount").isNumeric(),
  body("tokenAddress").isString(),
  body("orderId").isString(),
  body("expiration").isNumeric(),
  body("nonce").isString(),
];