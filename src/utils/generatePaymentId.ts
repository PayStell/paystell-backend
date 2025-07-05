// Create a custom alphabet for Base62 encoding (A-Z, a-z, 0-9)
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export async function generatePaymentId(): Promise<string> {
  try {
    // Use dynamic import to load nanoid ES Module
    const { customAlphabet } = await import("nanoid");
    const nanoid = customAlphabet(alphabet, 12);
    return nanoid();
  } catch (error) {
    // Fallback to a simple random ID generator if nanoid fails
    console.warn("nanoid import failed, using fallback ID generator:", error);
    return generateFallbackId();
  }
}

// Fallback ID generator
function generateFallbackId(): string {
  const chars = alphabet;
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Remove the example usage code for production
