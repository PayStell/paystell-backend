import request from 'supertest';
import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { 
    loginRateLimiter, 
    registerRateLimiter, 
    passwordResetRateLimiter, 
    twoFactorRateLimiter 
} from '../middlewares/authRateLimiter.middleware';

// Mock the AuthController
jest.mock('../controllers/AuthController', () => {
    return {
        AuthController: jest.fn().mockImplementation(() => {
            return {
                register: jest.fn().mockImplementation((req, res) => {
                    res.status(201).json({ message: 'User registered successfully' });
                }),
                login: jest.fn().mockImplementation((req, res) => {
                    if (req.body.email === 'fail@example.com') {
                        res.status(401).json({ message: 'Invalid credentials' });
                    } else {
                        res.status(200).json({ message: 'Login successful' });
                    }
                }),
                loginWith2FA: jest.fn().mockImplementation((req, res) => {
                    if (req.body.token === 'invalid') {
                        res.status(401).json({ message: 'Invalid 2FA token' });
                    } else {
                        res.status(200).json({ message: '2FA login successful' });
                    }
                }),
                forgotPassword: jest.fn().mockImplementation((req, res) => {
                    res.status(200).json({ message: 'Password reset email sent' });
                }),
                refreshToken: jest.fn().mockImplementation((req, res) => {
                    res.status(200).json({ message: 'Token refreshed' });
                }),
                getProfile: jest.fn().mockImplementation((req, res) => {
                    res.status(200).json({ id: 1, email: 'test@example.com' });
                })
            };
        })
    };
});

// Mock twoFactorAuthController
jest.mock('../controllers/twoFactorAuthController', () => ({
    enableTwoFactorAuthentication: jest.fn().mockResolvedValue({ 
        qrCode: 'qr-code-url', 
        secret: 'secret' 
    }),
    disableTwoFactorAuthentication: jest.fn().mockResolvedValue({ 
        message: '2FA disabled successfully' 
    })
}));

// Mock validateRequest middleware
jest.mock('../middlewares/validateRequest', () => ({
    validateRequest: () => (req: any, res: any, next: any) => next()
}));

// Mock authMiddleware
jest.mock('../middlewares/authMiddleware', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    }
}));

describe('Auth Routes with Rate Limiting', () => {
    let app: express.Application;
    let authController: any;
    
    beforeEach(() => {
        app = express();
        app.use(express.json());
        
        // Create a new instance of AuthController
        authController = new (AuthController as any)();
        
        // Create routes with rate limiters manually instead of using the authRoutes
        // This ensures we have control over the rate limiters in the test
        const router = express.Router();
        
        router.post('/login', loginRateLimiter, (req, res) => authController.login(req, res));
        router.post('/register', registerRateLimiter, (req, res) => authController.register(req, res));
        router.post('/login-2fa', twoFactorRateLimiter, (req, res) => authController.loginWith2FA(req, res));
        router.post('/forgot-password', passwordResetRateLimiter, (req, res) => authController.forgotPassword(req, res));
        
        app.use('/auth', router);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    it('should allow login requests within rate limit', async () => {
        // Make 5 login requests (the limit)
        for (let i = 0; i < 5; i++) {
            const response = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });
            
            expect(response.status).toBe(200);
            expect(response.headers['ratelimit-limit']).toBeDefined();
            expect(response.headers['ratelimit-remaining']).toBeDefined();
            expect(response.headers['ratelimit-reset']).toBeDefined();
        }
    });
    
    it('should block login requests that exceed rate limit', async () => {
        // Create a separate app to ensure rate limits are reset
        const app = express();
        app.use(express.json());
        const router = express.Router();
        router.post('/login', loginRateLimiter, (req, res) => {
            // Always return 401 to trigger rate limiting
            res.status(401).json({ message: 'Invalid credentials' });
        });
        app.use('/auth', router);
        
        // Make 5 failed login attempts to trigger rate limiting
        for (let i = 0; i < 5; i++) {
            await request(app)
                .post('/auth/login')
                .send({ email: 'fail@example.com', password: 'wrong' });
        }
        
        // The 6th request should be rate limited
        const response = await request(app)
            .post('/auth/login')
            .send({ email: 'fail@example.com', password: 'wrong' });
        
        expect(response.status).toBe(429);
        expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(response.headers['retry-after']).toBeDefined();
    });
    
    it('should allow register requests within rate limit', async () => {
        // Make 3 register requests (the limit)
        for (let i = 0; i < 3; i++) {
            const response = await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'Test User', 
                    email: `test${i}@example.com`, 
                    password: 'password' 
                });
            
            expect(response.status).toBe(201);
        }
    });
    
    it('should block register requests that exceed rate limit', async () => {
        // Create a separate app to ensure rate limits are reset
        const app = express();
        app.use(express.json());
        const router = express.Router();
        router.post('/register', registerRateLimiter, (req, res) => {
            res.status(201).json({ message: 'User registered successfully' });
        });
        app.use('/auth', router);
        
        // Make 3 register requests to trigger rate limiting
        for (let i = 0; i < 3; i++) {
            await request(app)
                .post('/auth/register')
                .send({ 
                    name: 'Test User', 
                    email: `test${i}@example.com`, 
                    password: 'password' 
                });
        }
        
        // The 4th request should be rate limited
        const response = await request(app)
            .post('/auth/register')
            .send({ 
                name: 'Test User', 
                email: 'test4@example.com', 
                password: 'password' 
            });
        
        expect(response.status).toBe(429);
    });
    
    it('should apply 2FA rate limiting correctly', async () => {
        // Create a separate app to ensure rate limits are reset
        const app = express();
        app.use(express.json());
        const router = express.Router();
        router.post('/login-2fa', twoFactorRateLimiter, (req, res) => {
            // Always return 401 to trigger rate limiting
            res.status(401).json({ message: 'Invalid 2FA token' });
        });
        app.use('/auth', router);
        
        // Make 3 failed 2FA attempts
        for (let i = 0; i < 3; i++) {
            await request(app)
                .post('/auth/login-2fa')
                .send({ 
                    email: 'test@example.com', 
                    password: 'password', 
                    token: 'invalid' 
                });
        }
        
        // 4th attempt should be rate limited
        const response = await request(app)
            .post('/auth/login-2fa')
            .send({ 
                email: 'test@example.com', 
                password: 'password', 
                token: 'invalid' 
            });
        
        expect(response.status).toBe(429);
        
        // Create a new app for the different email test
        const app2 = express();
        app2.use(express.json());
        const router2 = express.Router();
        router2.post('/login-2fa', twoFactorRateLimiter, (req, res) => {
            res.status(200).json({ message: '2FA login successful' });
        });
        app2.use('/auth', router2);
        
        // Try with a different email - should work
        const differentEmailResponse = await request(app2)
            .post('/auth/login-2fa')
            .send({ 
                email: 'different@example.com', 
                password: 'password', 
                token: 'valid' 
            });
        
        expect(differentEmailResponse.status).toBe(200);
    });
    
    it('should apply forgot-password rate limiting per email', async () => {
        // Create a separate app to ensure rate limits are reset
        const app = express();
        app.use(express.json());
        const router = express.Router();
        router.post('/forgot-password', passwordResetRateLimiter, (req, res) => {
            res.status(200).json({ message: 'Password reset email sent' });
        });
        app.use('/auth', router);
        
        // Make 3 password reset requests for the same email
        for (let i = 0; i < 3; i++) {
            await request(app)
                .post('/auth/forgot-password')
                .send({ email: 'test@example.com' });
        }
        
        // 4th attempt with same email should be rate limited
        const response = await request(app)
            .post('/auth/forgot-password')
            .send({ email: 'test@example.com' });
        
        expect(response.status).toBe(429);
        
        // Try with a different email - should work
        const differentEmailResponse = await request(app)
            .post('/auth/forgot-password')
            .send({ email: 'different@example.com' });
        
        expect(differentEmailResponse.status).toBe(200);
    });
});