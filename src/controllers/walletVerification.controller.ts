import { Controller, Post, Body } from '@nestjs/common';
import { WalletVerificationService } from '../services/walletVerification.service';
import { InitiateWalletVerificationDto, VerifyWalletDto } from '../dtos/WalletVerificationDTO';

@Controller('wallet-verification')
export class WalletVerificationController {
    constructor(
        private walletVerificationService: WalletVerificationService
    ) {}

    @Post('initiate')
    async initiateVerification(
        @Body() dto: InitiateWalletVerificationDto
    ) {
        return this.walletVerificationService.initiateVerification(
            dto.userId,
            dto.walletAddress
        );
    }

    @Post('verify')
    async verifyWallet(@Body() dto: VerifyWalletDto) {
        return this.walletVerificationService.verifyWallet(
            dto.token,
            dto.code
        );
    }
}
