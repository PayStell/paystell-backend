import { customAlphabet } from "nanoid";

// Create a custom alphabet for Base62 encoding (A-Z, a-z, 0-9)
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Create a nanoid function with our custom alphabet
const nanoid = customAlphabet(alphabet, 12); // Length set to 12 to match test expectations

export function generatePaymentId(): string {
  return nanoid();
}

// Remove the example usage code for production
