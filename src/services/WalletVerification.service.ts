import { Injectable } from '@nestjs/common';
import { Repository, MoreThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletVerification } from '../entities/WalletVerification';
import { User } from '../entities/User';
import * as crypto from 'crypto';
import EmailService from './emailVerification.service';

@Injectable()
export class WalletVerificationService {
    constructor(
        @InjectRepository(WalletVerification)
        private walletVerificationRepo: Repository<WalletVerification>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private emailService: EmailService
    ) {}

    async initiateVerification(userId: string, walletAddress: string): Promise<WalletVerification> {
        // Ensure the wallet address is valid
        if (!walletAddress.startsWith('G') || walletAddress.length !== 56) {
            throw new Error('Invalid Stellar wallet address');
        }

        // Check if wallet is already linked
        const existingWallet = await this.walletVerificationRepo.findOne({
            where: { walletAddress, status: 'verified' },
        });

        if (existingWallet) {
            throw new Error('This wallet is already linked to another account');
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
        await this.emailService.sendVerificationEmail(
            verification.user.email,
            verification.verificationCode
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
            throw new Error('Invalid or expired verification');
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
