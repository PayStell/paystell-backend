import { Request, Response } from "express";
import { PaymentLinkService } from "../services/PaymentLink.services";
import { Repository } from "typeorm";
import { PaymentLink } from "../entities/PaymentLink";
import { AppDataSource } from "../config/db";
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

  async createPaymentLink(req: Request, res: Response): Promise<Response> {
    try {
      const dto = new CreatePaymentLinkDto();
      Object.assign(dto, req.body);

      const errors = await validate(dto);
      if (errors.length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const paymentLink = await this.paymentLinkService.createPaymentLink(dto);
      return res.status(201).json(paymentLink);
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  async getPaymentLinkById(req: Request, res: Response): Promise<Response> {
    try {
      const paymentLink = await this.paymentLinkService.getPaymentLinkById(
        req.params.id,
      );
      if (!paymentLink) {
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.json(paymentLink);
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  async getPaymentLinksByUserId(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const paymentLinks =
        await this.paymentLinkService.getPaymentLinksByUserId(
          req.params.userId,
          page,
          limit,
        );
      return res.json(paymentLinks);
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }

  async updatePaymentLink(req: Request, res: Response): Promise<Response> {
    try {
      const dto = new UpdatePaymentLinkDto();
      Object.assign(dto, req.body);

      const errors = await validate(dto);
      if (errors.length > 0) {
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
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.json(updatedPaymentLink);
    } catch (error) {
      return res.status(400).json({ message: (error as Error).message });
    }
  }

  async deletePaymentLink(req: Request, res: Response): Promise<Response> {
    try {
      const success = await this.paymentLinkService.deletePaymentLink(
        req.params.id,
      );
      if (!success) {
        return res.status(404).json({ message: "PaymentLink not found" });
      }
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: (error as Error).message });
    }
  }
}
