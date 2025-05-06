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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = this.generateSlug(name);
    let counter = 1;
    let uniqueSlug = slug;

    while (true) {
      const existingLink = await this.paymentLinkRepository.findOne({
        where: { slug: uniqueSlug },
      });

      if (!existingLink) {
        return uniqueSlug;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  async createPaymentLink(data: Partial<PaymentLink>): Promise<PaymentLink> {
    if (!data.name) {
      throw new Error('Name is required to generate a payment link');
    }

    const slug = await this.generateUniqueSlug(data.name);
    try {
      const paymentLink = this.paymentLinkRepository.create({ ...data, slug });
      return await this.paymentLinkRepository.save(paymentLink);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === '23505') {          // PostgreSQL unique_violation
        // retry once with a new slug
        data.slug = await this.generateUniqueSlug(data.name!);
        return this.paymentLinkRepository.save(data as PaymentLink);
      }
      throw e;
    }
  }

  async getPaymentLinkById(id: string): Promise<PaymentLink | null> {
    return await this.paymentLinkRepository.findOne({ where: { id } });
  }

  async updatePaymentLink(
    id: string,
    data: Partial<PaymentLink>,
  ): Promise<PaymentLink | null> {
    // If name is being updated, regenerate the slug
    if (data.name) {
      data.slug = await this.generateUniqueSlug(data.name);
    }
    
    await this.paymentLinkRepository.update(id, data);
    return this.getPaymentLinkById(id);
  }

  async deletePaymentLink(id: string): Promise<boolean> {
    const result = await this.paymentLinkRepository.delete(id);
    return result.affected !== 0;
  }

  async softDeletePaymentLink(id: string): Promise<boolean> {
    const result = await this.paymentLinkRepository.softDelete(id);
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
      withDeleted: false,
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
