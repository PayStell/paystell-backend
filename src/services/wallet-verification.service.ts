import { Repository, MoreThan } from 'typeorm';
import DataSource from '../config/db';
import { WalletVerification } from '../entities/WalletVerification';
import { User } from '../entities/User';
import * as crypto from 'crypto';
import EmailService from './emailVerification.service';
import { isValidStellarAddress, checkStellarWalletExists } from '../utils/isStellarAddress';

class WalletVerificationService {
    private walletVerificationRepo: Repository<WalletVerification>;
    private userRepo: Repository<User>;
    private emailService: EmailService;

    constructor() {
        this.walletVerificationRepo = DataSource.getRepository(WalletVerification);
        this.userRepo = DataSource.getRepository(User);
        this.emailService = new EmailService();
    }

    async initiateVerification(userId: number, walletAddress: string): Promise<WalletVerification> {
        // Validate the Stellar wallet address
        if (!isValidStellarAddress(walletAddress)) {
            throw new Error('Invalid Stellar wallet address.');
        }

        // Generate token and verification code
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Create verification record
        const verification = this.walletVerificationRepo.create({
            userId,
            walletAddress,
            verificationToken,
            verificationCode,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        await this.walletVerificationRepo.save(verification);

        // Send verification email
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error('User not found.');

        await this.emailService.sendWalletVerificationEmail(
            user.email,
            verification.walletAddress,
            verification.verificationCode,
        );

        return verification;
    }

    async verifyWallet(token: string, code: string): Promise<boolean> {
        const verification = await this.walletVerificationRepo.findOne({
            where: {
                verificationToken: token,
                verificationCode: code,
                status: 'pending',
                expiresAt: MoreThan(new Date())
            },
            relations: ['user']
        });

        if (!verification) {
            throw new Error('Invalid or expired verification.');
        }

        // Validate the Stellar wallet format
        if (!isValidStellarAddress(verification.walletAddress)) {
            throw new Error('Invalid Stellar wallet address.');
        }

        // Check if the wallet exists on the Stellar mainnet
        const walletExists = await checkStellarWalletExists(verification.walletAddress);
        if (!walletExists) {
            throw new Error('The provided Stellar wallet does not exist on the network.');
        }

        // Update verification status
        verification.status = 'verified';
        await this.walletVerificationRepo.save(verification);

        // Update user with verified wallet
        const user = verification.user;
        user.walletAddress = verification.walletAddress;
        user.isWalletVerified = true;
        await this.userRepo.save(user);

        return true;
    }
}

export default WalletVerificationService;
