import { Repository } from "typeorm";
import { PaymentLink } from "../entities/PaymentLink";

interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaymentLinkService {
  constructor(
    private readonly paymentLinkRepository: Repository<PaymentLink>,
  ) {}

  async createPaymentLink(data: Partial<PaymentLink>): Promise<PaymentLink> {
    const paymentLink = this.paymentLinkRepository.create(data);
    return await this.paymentLinkRepository.save(paymentLink);
  }

  async getPaymentLinkById(id: string): Promise<PaymentLink | null> {
    return await this.paymentLinkRepository.findOne({ where: { id } });
  }

  async updatePaymentLink(
    id: string,
    data: Partial<PaymentLink>,
  ): Promise<PaymentLink | null> {
    await this.paymentLinkRepository.update(id, data);
    return this.getPaymentLinkById(id);
  }

  async deletePaymentLink(id: string): Promise<boolean> {
    const result = await this.paymentLinkRepository.delete(id);
    return result.affected !== 0;
  }

  async getPaymentLinksByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResult<PaymentLink>> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.paymentLinkRepository.findAndCount({
      where: { userId: Number(userId) },
      skip,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
