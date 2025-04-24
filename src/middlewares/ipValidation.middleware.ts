import { Request, Response, NextFunction } from "express";

// Extender el tipo Request de Express globalmente
import "express";
declare module "express" {
  interface Request {
    validatedIp?: string;
  }
}

/**
 * Middleware to validate and normalize IP addresses
 * Helps prevent IP spoofing by checking trusted headers in a specific order
 */
export const validateIpAddress = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the real IP by checking various headers in order of trust
    const forwardedFor = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];

    // Store the validated IP in a custom property
    let validatedIp = req.ip; // Default to Express's req.ip

    if (typeof forwardedFor === "string") {
      // X-Forwarded-For can be comma-separated list of IPs
      // The leftmost IP is the original client IP
      const ips = forwardedFor.split(",").map((ip) => ip.trim());

      // Validate the leftmost IP
      if (ips.length > 0 && isValidIp(ips[0])) {
        validatedIp = ips[0];
      }
    } else if (typeof realIp === "string" && isValidIp(realIp)) {
      validatedIp = realIp;
    }

    // Add a custom property to store our validated IP
    req.validatedIp = validatedIp;

    // In development, allow all requests
    if (process.env.NODE_ENV === "development") {
      next();
      return;
    }

    // Log suspicious requests with multiple different IP headers
    if (
      typeof forwardedFor === "string" &&
      typeof realIp === "string" &&
      forwardedFor.split(",")[0].trim() !== realIp
    ) {
      console.warn(
        `Suspicious request with mismatched IP headers: X-Forwarded-For=${forwardedFor}, X-Real-IP=${realIp}`,
      );
    }

    next();
  } catch (error) {
    console.error("Error in IP validation middleware:", error);
    next(); // Continue even if there's an error in development
  }
};

/**
 * Helper function to validate an IP address
 */
function isValidIp(ip: string): boolean {
  // Simple IPv4 validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = ip.match(ipv4Regex);

  if (ipv4Match) {
    return ipv4Match.slice(1).every((octet) => parseInt(octet, 10) <= 255);
  }

  // Simple IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
}
