import { Router, Request, Response, NextFunction } from 'express';
import { PaymentLinkController } from '../controllers/PaymentLink.controller';

const router = Router();
const paymentLinkController = new PaymentLinkController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.post('/', asyncHandler(paymentLinkController.createPaymentLink.bind(paymentLinkController)));
router.get('/:id', asyncHandler(paymentLinkController.getPaymentLinkById.bind(paymentLinkController)));
router.put('/:id', asyncHandler(paymentLinkController.updatePaymentLink.bind(paymentLinkController)));
router.delete('/:id', asyncHandler(paymentLinkController.deletePaymentLink.bind(paymentLinkController)));

export default router;
