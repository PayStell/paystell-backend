import { isValidStellarAddress, checkStellarWalletExists } from '../utils/isStellarAddress';
import axios from 'axios';

jest.mock('axios');

describe('Stellar Wallet Utilities', () => {
    describe('isValidStellarAddress', () => {
        it('should return true for a valid Stellar address', () => {
            expect(isValidStellarAddress('GCFD4EZYQJ6Q3PXYUPLVUET6C4LZYI6HUE7WNKVRZT2FLYQZMEPLK2V5')).toBe(true);
        });

        it('should return false for an invalid Stellar address', () => {
            expect(isValidStellarAddress('INVALID123')).toBe(false);
            expect(isValidStellarAddress('')).toBe(false);
        });
    });

    describe('checkStellarWalletExists', () => {
        it('should return true if the wallet exists', async () => {
            (axios.get as jest.Mock).mockResolvedValue({ status: 200 });
            await expect(checkStellarWalletExists('GCFD4EZYQJ6Q3PXYUPLVUET6C4LZYI6HUE7WNKVRZT2FLYQZMEPLK2V5')).resolves.toBe(true);
        });

        it('should return false if the wallet does not exist', async () => {
            (axios.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
            await expect(checkStellarWalletExists('GCFD4EZYQJ6Q3PXYUPLVUET6C4LZYI6HUE7WNKVRZT2FLYQZMEPLK2V5')).resolves.toBe(false);
        });

        it('should throw an error on API failure', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
            await expect(checkStellarWalletExists('GCFD4EZYQJ6Q3PXYUPLVUET6C4LZYI6HUE7WNKVRZT2FLYQZMEPLK2V5')).rejects.toThrow('Error checking Stellar account: Network Error');
        });
    });
});
