import { Request, Response } from "express";
import { PaymentLinkService } from "../services/PaymentLink.services";
import { Repository } from "typeorm";
import { PaymentLink } from "../entities/PaymentLink";
import AppDataSource from "../config/db";
import {
  CreatePaymentLinkDto,
  UpdatePaymentLinkDto,
} from "../dtos/PaymentLink.dto";
import { validate } from "class-validator";

export class PaymentLinkController {
  private paymentLinkService: PaymentLinkService;

  constructor() {
    const paymentLinkRepository: Repository<PaymentLink> =
      AppDataSource.getRepository(PaymentLink);
    this.paymentLinkService = new PaymentLinkService(paymentLinkRepository);
  }

  async createPaymentLink(req: Request & { user?: { id: number } }, res: Response): Promise<Response> {
    try {
      console.log(
        '[PaymentLinkController] Creating payment link',
        { fields: Object.keys(req.body) } // log only non-sensitive metadata
      );
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const dto = new CreatePaymentLinkDto();
      Object.assign(dto, { ...req.body, userId });

      const errors = await validate(dto);
      if (errors.length > 0) {
        console.error('[PaymentLinkController] Validation errors:', errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const paymentLink = await this.paymentLinkService.createPaymentLink(dto);
      console.log('[PaymentLinkController] Successfully created payment link:', paymentLink);
      return res.status(201).json(paymentLink);
    } catch (error) {
      console.error('[PaymentLinkController] Error creating payment link:', error);
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
      console.error('[PaymentLinkController] Unhandled error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getPaymentLinkById(req: Request, res: Response): Promise<Response> {
    try {
      console.log('[PaymentLinkController] Getting payment link by id:', req.params.id);
      
      const paymentLink = await this.paymentLinkService.getPaymentLinkById(
        req.params.id,
      );
      if (!paymentLink) {
        console.log('[PaymentLinkController] Payment link not found:', req.params.id);
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.json(paymentLink);
    } catch (error) {
      console.error('[PaymentLinkController] Error getting payment link:', error);
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  async getPaymentLinksByUserId(
    req: Request & { user?: { id: number } },
    res: Response,
  ): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log('[PaymentLinkController] Getting payment links for user:', {
        userId,
        page,
        limit
      });

      const paymentLinks = await this.paymentLinkService.getPaymentLinksByUserId(
        userId.toString(),
        page,
        limit,
      );
      return res.json(paymentLinks);
    } catch (error) {
      console.error('[PaymentLinkController] Error getting payment links by user:', error);
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  async updatePaymentLink(req: Request, res: Response): Promise<Response> {
    try {
      console.log('[PaymentLinkController] Updating payment link:', {
        id: req.params.id,
        data: req.body
      });
      
      const dto = new UpdatePaymentLinkDto();
      Object.assign(dto, req.body);

      const errors = await validate(dto);
      if (errors.length > 0) {
        console.error('[PaymentLinkController] Validation errors:', errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const updatedPaymentLink =
        await this.paymentLinkService.updatePaymentLink(req.params.id, dto);
      if (!updatedPaymentLink) {
        console.log('[PaymentLinkController] Payment link not found for update:', req.params.id);
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.json(updatedPaymentLink);
    } catch (error) {
      console.error('[PaymentLinkController] Error updating payment link:', error);
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  async deletePaymentLink(req: Request, res: Response): Promise<Response> {
    try {
      console.log('[PaymentLinkController] Deleting payment link:', req.params.id);
      
      const success = await this.paymentLinkService.deletePaymentLink(
        req.params.id,
      );
      if (!success) {
        console.log('[PaymentLinkController] Payment link not found for deletion:', req.params.id);
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.status(204).send();
    } catch (error) {
      console.error('[PaymentLinkController] Error deleting payment link:', error);
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  async softDeletePaymentLink(req: Request, res: Response): Promise<Response> {
    try {
      console.log('[PaymentLinkController] Soft deleting payment link:', req.params.id);
      
      const success = await this.paymentLinkService.softDeletePaymentLink(
        req.params.id,
      );
      if (!success) {
        console.log('[PaymentLinkController] Payment link not found for soft deletion:', req.params.id);
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.status(204).send();
    } catch (error) {
      console.error('[PaymentLinkController] Error soft deleting payment link:', error);
      return res.status(500).json({ message: (error as Error).message });
    }
  }
}
