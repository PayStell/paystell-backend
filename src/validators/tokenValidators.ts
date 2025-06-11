import { body, param } from "express-validator";

// Stellar address validation regex
const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

export const validateAddTokenSupport = [
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

export const validateMerchantParam = [
  param("merchantAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid merchant address format. Must be a valid Stellar address",
    ),
];

export const validateTokenParam = [
  param("tokenAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid token address format. Must be a valid Stellar address",
    ),
];

export const validateTokenSupportParams = [
  param("merchantAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid merchant address format. Must be a valid Stellar address",
    ),

  param("tokenAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid token address format. Must be a valid Stellar address",
    ),
];

export const validateTokenAddressBody = [
  body("tokenAddress")
    .isString()
    .matches(STELLAR_ADDRESS_REGEX)
    .withMessage(
      "Invalid token address format. Must be a valid Stellar address",
    ),
];
