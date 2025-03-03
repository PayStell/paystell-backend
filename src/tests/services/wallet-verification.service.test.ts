import WalletVerificationService from '../../services/wallet-verification.service';
import { WalletVerification } from '../../entities/WalletVerification';
import { User } from '../../entities/User';
import { Repository } from 'typeorm';
import { isValidStellarAddress, checkStellarWalletExists } from '../../utils/isStellarAddress';
import EmailService from '../../services/emailVerification.service';
import { UserRole } from "../../enums/UserRole";

jest.mock('../../utils/isStellarAddress');
jest.mock('../../services/emailVerification.service');

describe('WalletVerificationService', () => {
    let service: WalletVerificationService;
    let walletVerificationRepo: jest.Mocked<Repository<WalletVerification>>;
    let userRepo: jest.Mocked<Repository<User>>;
    let emailService: jest.Mocked<EmailService>;

    beforeEach(() => {
        walletVerificationRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
        } as any;
        userRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
        } as any;
        emailService = new EmailService() as jest.Mocked<EmailService>;

        service = new WalletVerificationService();
        (service as any).walletVerificationRepo = walletVerificationRepo;
        (service as any).userRepo = userRepo;
        (service as any).emailService = emailService;
    });

    describe('initiateVerification', () => {
        it('should throw an error if the wallet address is invalid', async () => {
            (isValidStellarAddress as jest.Mock).mockReturnValue(false);
            await expect(service.initiateVerification(1, 'INVALID_WALLET'))
                .rejects.toThrow('Invalid Stellar wallet address.');
        });

        it('should create a verification record and send an email', async () => {
            (isValidStellarAddress as jest.Mock).mockReturnValue(true);

            const mockWalletVerification: WalletVerification = {
                id: 'mock-uuid',
                userId: 1,
                walletAddress: 'GCFD...',
                verificationToken: 'mock-token',
                verificationCode: '123456',
                expiresAt: new Date(Date.now() + 86400000),
                status: 'pending',
                user: {} as User,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            walletVerificationRepo.create.mockReturnValue(mockWalletVerification);
            userRepo.findOne.mockResolvedValue({
                id: 1,
                name: 'Test User',
                email: 'user@example.com',
                password: 'hashedpassword',
                role: UserRole.USER,
                isEmailVerified: true,
                isWalletVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as User);

            await service.initiateVerification(1, 'GCFD...');

            expect(walletVerificationRepo.save).toHaveBeenCalled();
            expect(emailService.sendWalletVerificationEmail).toHaveBeenCalled();
        });
    });

    describe('verifyWallet', () => {
        it('should throw an error if verification entry does not exist', async () => {
            walletVerificationRepo.findOne.mockResolvedValue(null);
            await expect(service.verifyWallet('token', '123456'))
                .rejects.toThrow('Invalid or expired verification.');
        });

        it('should verify and update the user wallet', async () => {
            const user: any = {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                password: 'hashedpassword',
                role: UserRole.USER,
                isEmailVerified: true,
                isWalletVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockWalletVerification: WalletVerification = {
                id: 'mock-uuid',
                userId: 1,
                walletAddress: 'GCFD...',
                verificationToken: 'mock-token',
                verificationCode: '123456',
                expiresAt: new Date(Date.now() + 86400000),
                status: 'pending',
                user: user,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            walletVerificationRepo.findOne.mockResolvedValue(mockWalletVerification);
            (checkStellarWalletExists as jest.Mock).mockResolvedValue(true);

            await service.verifyWallet('mock-token', '123456');

            expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                walletAddress: 'GCFD...',
                isWalletVerified: true,
            }));
        });
    });
});
