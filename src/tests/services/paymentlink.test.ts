import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { PaymentLink } from '../../entities/PaymentLink';
import { PaymentLinkService } from '../../services/PaymentLink.services';

jest.mock('typeorm', () => ({
    Repository: jest.fn().mockImplementation(() => ({
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    })),
}));

describe('PaymentLinkService', () => {
    let paymentLinkService: PaymentLinkService;
    let paymentLinkRepository: jest.Mocked<Repository<PaymentLink>>;

    beforeEach(() => {
        paymentLinkRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as unknown as jest.Mocked<Repository<PaymentLink>>;

        paymentLinkService = new PaymentLinkService(paymentLinkRepository);
    });

    it('should create a payment link', async () => {
        const mockData: Partial<PaymentLink> = { 
            id: '1', 
            name: 'Test Payment', 
            sku: 'TEST123', 
            amount: 100.00, 
            currency: 'USD', 
            status: 'active' 
        };

        paymentLinkRepository.create.mockReturnValue(mockData as PaymentLink);
        paymentLinkRepository.save.mockResolvedValue(mockData as PaymentLink);

        const result = await paymentLinkService.createPaymentLink(mockData);
        expect(paymentLinkRepository.create).toHaveBeenCalledWith(mockData);
        expect(paymentLinkRepository.save).toHaveBeenCalledWith(mockData);
        expect(result).toEqual(mockData);
    });

    it('should get a payment link by ID', async () => {
        const mockData: PaymentLink = { 
            id: '1', 
            name: 'Test Payment', 
            sku: 'TEST123', 
            amount: 100.00, 
            currency: 'USD', 
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as PaymentLink;

        paymentLinkRepository.findOne.mockResolvedValue(mockData);

        const result = await paymentLinkService.getPaymentLinkById('1');
        expect(paymentLinkRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
        expect(result).toEqual(mockData);
    });

    it('should update a payment link', async () => {
        const mockData: Partial<PaymentLink> = { 
            id: '1', 
            name: 'Updated Payment', 
            amount: 150.00 
        };

        const mockUpdateResult: UpdateResult = { affected: 1, raw: [], generatedMaps: [] };
        paymentLinkRepository.update.mockResolvedValue(mockUpdateResult);
        paymentLinkRepository.findOne.mockResolvedValue(mockData as PaymentLink);

        const result = await paymentLinkService.updatePaymentLink('1', { name: 'Updated Payment', amount: 150.00 });
        expect(paymentLinkRepository.update).toHaveBeenCalledWith('1', { name: 'Updated Payment', amount: 150.00 });
        expect(result).toEqual(mockData);
    });

    it('should return null when updating a non-existent payment link', async () => {
        const mockUpdateResult: UpdateResult = { affected: 0, raw: [], generatedMaps: [] };
        paymentLinkRepository.update.mockResolvedValue(mockUpdateResult);
        paymentLinkRepository.findOne.mockResolvedValue(null);

        const result = await paymentLinkService.updatePaymentLink('1', { name: 'Nonexistent Payment' });
        expect(paymentLinkRepository.update).toHaveBeenCalledWith('1', { name: 'Nonexistent Payment' });
        expect(result).toBeNull();
    });

    it('should delete a payment link successfully', async () => {
        const mockDeleteResult: DeleteResult = { affected: 1, raw: [] };
        paymentLinkRepository.delete.mockResolvedValue(mockDeleteResult);

        const result = await paymentLinkService.deletePaymentLink('1');
        expect(paymentLinkRepository.delete).toHaveBeenCalledWith('1');
        expect(result).toBe(true);
    });

    it('should return false when trying to delete a non-existent payment link', async () => {
        const mockDeleteResult: DeleteResult = { affected: 0, raw: [] };
        paymentLinkRepository.delete.mockResolvedValue(mockDeleteResult);

        const result = await paymentLinkService.deletePaymentLink('1');
        expect(paymentLinkRepository.delete).toHaveBeenCalledWith('1');
        expect(result).toBe(false);
    });
});
