import { Request, Response, NextFunction } from "express";
import { verify, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";


export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ 
            status: 'error',
            message: 'No token provided',
            code: 'NO_TOKEN'
        });
        return;
    }

    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ 
            status: 'error',
            message: 'Invalid token format',
            code: 'INVALID_FORMAT'
        });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verify(
            token, 
            process.env.JWT_SECRET || 'your-secret-key'
        ) as JwtPayload;

        req.user = {
            id: decoded.id,
            email: decoded.email,
            tokenExp: decoded.exp
        };

        // Token expiration warning (5 minutes)
        const tokenExp = decoded.exp || 0;
        const now = Math.floor(Date.now() / 1000);
        if (tokenExp - now < 300) {
            res.setHeader('X-Token-Expiring', 'true');
            res.setHeader('X-Token-Expires-In', String(tokenExp - now));
        }

        next();
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            res.status(401).json({
                status: 'error',
                message: "Token has expired",
                code: 'TOKEN_EXPIRED'
            });
        } else if (error instanceof JsonWebTokenError) {
            res.status(401).json({
                status: 'error',
                message: "Invalid token",
                code: 'INVALID_TOKEN'
            });
        } else {
            res.status(401).json({
                status: 'error',
                message: 'Token validation failed',
                code: 'TOKEN_VALIDATION_FAILED'
            });
        }
    }
};