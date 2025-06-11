import { body, param } from "express-validator";

// Stellar address validation regex
const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

export const validatePayment = [
  body("payerAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid payer address format. Must be a valid Stellar address",
    ),

  body("merchantAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid merchant address format. Must be a valid Stellar address",
    ),

  body("amount")
    .isNumeric({ no_symbols: false })
    .isFloat({ min: 0.0000001 })
    .withMessage(
      "Amount must be a positive number with minimum value of 0.0000001",
    ),

  body("tokenAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid token address format. Must be a valid Stellar address",
    ),

  body("orderId")
    .isString()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Order ID must be alphanumeric with underscores and hyphens only",
    ),

  body("expiration")
    .isInt({ min: Math.floor(Date.now() / 1000) })
    .withMessage("Expiration must be a future timestamp"),

  body("nonce")
    .isString()
    .isLength({ min: 8, max: 64 })
    .withMessage("Nonce must be between 8 and 64 characters"),

  body("signature")
    .optional()
    .isString()
    .isBase64()
    .withMessage("Signature must be a valid base64 string"),
];

export const validateTokenSupport = [
  body("merchantAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid merchant address format. Must be a valid Stellar address",
    ),

  body("tokenAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid token address format. Must be a valid Stellar address",
    ),
];

export const validateTokenAddress = [
  body("tokenAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid token address format. Must be a valid Stellar address",
    ),
];

export const validateMerchantAddress = [
  param("merchantAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid merchant address format. Must be a valid Stellar address",
    ),
];

export const validatePaymentId = [
  param("paymentId")
    .isString()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Payment ID must be alphanumeric with underscores and hyphens only",
    ),
];

export const validatePaymentStatus = [
  body("status")
    .isIn(["pending", "completed", "failed"])
    .withMessage("Status must be one of: pending, completed, failed"),
];

export const validateTransactionVerification = [
  body("transactionHash")
    .isString()
    .isLength({ min: 64, max: 64 })
    .matches(/^[a-fA-F0-9]{64}$/)
    .withMessage("Transaction hash must be a 64-character hexadecimal string"),

  body("expectedAmount")
    .isString()
    .matches(/^\d+(\.\d+)?$/)
    .withMessage("Expected amount must be a valid decimal string"),

  body("expectedDestination")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage("Expected destination must be a valid Stellar address"),

  body("expectedAsset")
    .isString()
    .isLength({ min: 1, max: 12 })
    .withMessage("Expected asset must be between 1 and 12 characters"),
];
