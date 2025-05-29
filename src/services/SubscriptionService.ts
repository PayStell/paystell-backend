import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { Subscription, SubscriptionStatus, BillingInterval } from "../entities/Subscription";
import { BillingCycle, BillingCycleStatus } from "../entities/BillingCycle";
import { SubscriptionEvent, SubscriptionEventType } from "../entities/SubscriptionEvent";
import { PaymentService } from "./PaymentService";
import { NotificationService } from "./inAppNotificationService";
import { NotificationType, NotificationCategory } from "../entities/InAppNotification.entity";
import { generatePaymentId } from "../utils/generatePaymentId";
import { AppError } from "../utils/AppError";
import { logInfo, logError } from "../utils/logger";

export interface CreateSubscriptionParams {
  customerId: string;
  customerEmail: string;
  merchantId: string;
  amount: number;
  currency: string;
  tokenAddress: string;
  billingInterval: BillingInterval;
  intervalCount?: number;
  startDate?: Date;
  metadata?: Record<string, any>;
}

export class SubscriptionService {
  private subscriptionRepository: Repository<Subscription>;
  private billingCycleRepository: Repository<BillingCycle>;
  private eventRepository: Repository<SubscriptionEvent>;
  private paymentService: PaymentService;
  private notificationService: NotificationService;

  constructor() {
    this.subscriptionRepository = AppDataSource.getRepository(Subscription);
    this.billingCycleRepository = AppDataSource.getRepository(BillingCycle);
    this.eventRepository = AppDataSource.getRepository(SubscriptionEvent);
    this.paymentService = new PaymentService();
    this.notificationService = new NotificationService();
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const subscription = new Subscription();
    subscription.subscriptionId = generatePaymentId();
    subscription.customerId = params.customerId;
    subscription.customerEmail = params.customerEmail;
    subscription.merchantId = params.merchantId;
    subscription.amount = params.amount;
    subscription.currency = params.currency;
    subscription.tokenAddress = params.tokenAddress;
    subscription.billingInterval = params.billingInterval;
    subscription.intervalCount = params.intervalCount || 1;
    subscription.startDate = params.startDate || new Date();
    subscription.nextBillingDate = this.calculateNextBillingDate(
      subscription.startDate,
      params.billingInterval,
      params.intervalCount || 1
    );
    subscription.metadata = params.metadata;
    subscription.status = SubscriptionStatus.ACTIVE;

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Create first billing cycle
    await this.createBillingCycle(savedSubscription);

    // Log event
    await this.logEvent(savedSubscription.id, SubscriptionEventType.CREATED, {
      subscriptionId: savedSubscription.subscriptionId,
    });

    // Send notification
    await this.notificationService.createNotification({
      title: "Subscription Created",
      message: `New subscription created for ${params.customerEmail}`,
      notificationType: NotificationType.MERCHANT,
      category: NotificationCategory.SUCCESS,
      recipientId: params.merchantId,
      metadata: { subscriptionId: savedSubscription.subscriptionId },
    });

    logInfo(`Subscription created: ${savedSubscription.subscriptionId}`);
    return savedSubscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { subscriptionId },
      relations: ["merchant", "billingCycles", "events"],
    });
  }

  async getSubscriptionsByMerchant(merchantId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { merchantId },
      relations: ["billingCycles"],
      order: { createdAt: "DESC" },
    });
  }

  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }

    subscription.status = SubscriptionStatus.PAUSED;
    const updated = await this.subscriptionRepository.save(subscription);

    await this.logEvent(subscription.id, SubscriptionEventType.PAUSED);
    return updated;
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.nextBillingDate = this.calculateNextBillingDate(
      new Date(),
      subscription.billingInterval,
      subscription.intervalCount
    );

    const updated = await this.subscriptionRepository.save(subscription);
    await this.logEvent(subscription.id, SubscriptionEventType.RESUMED);
    return updated;
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.endDate = new Date();

    const updated = await this.subscriptionRepository.save(subscription);
    await this.logEvent(subscription.id, SubscriptionEventType.CANCELLED);
    return updated;
  }

  async processScheduledPayments(): Promise<void> {
    const now = new Date();
    const dueBillingCycles = await this.billingCycleRepository.find({
      where: {
        status: BillingCycleStatus.PENDING,
        dueDate: { $lte: now } as any,
      },
      relations: ["subscription"],
    });

    logInfo(`Processing ${dueBillingCycles.length} due billing cycles`);

    for (const cycle of dueBillingCycles) {
      await this.processBillingCycle(cycle);
    }
  }

  private async processBillingCycle(cycle: BillingCycle): Promise<void> {
    try {
      cycle.status = BillingCycleStatus.PROCESSING;
      await this.billingCycleRepository.save(cycle);

      // Process payment through Stellar
      await this.paymentService.processPayment(
        cycle.subscription.customerId,
        cycle.subscription.merchantId,
        cycle.amount,
        cycle.subscription.tokenAddress,
        `sub_${cycle.id}`,
        Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
        generatePaymentId()
      );

      cycle.status = BillingCycleStatus.COMPLETED;
      cycle.paidAt = new Date();
      await this.billingCycleRepository.save(cycle);

      // Create next billing cycle
      await this.createBillingCycle(cycle.subscription);

      await this.logEvent(
        cycle.subscription.id,
        SubscriptionEventType.PAYMENT_SUCCESS,
        { billingCycleId: cycle.id }
      );

      logInfo(`Payment processed successfully for cycle ${cycle.id}`);
    } catch (error) {
      await this.handlePaymentFailure(cycle, error as Error);
    }
  }

  private async handlePaymentFailure(cycle: BillingCycle, error: Error): Promise<void> {
    cycle.status = BillingCycleStatus.FAILED;
    cycle.failureReason = error.message;
    cycle.retryCount += 1;
    cycle.lastRetryAt = new Date();

    const subscription = cycle.subscription;
    subscription.failedPaymentCount += 1;

    if (cycle.retryCount < subscription.maxRetries) {
      // Schedule retry
      cycle.nextRetryAt = new Date(Date.now() + this.getRetryDelay(cycle.retryCount));
      cycle.status = BillingCycleStatus.PENDING;

      await this.logEvent(
        subscription.id,
        SubscriptionEventType.PAYMENT_RETRY,
        { billingCycleId: cycle.id, retryCount: cycle.retryCount }
      );
    } else {
      // Max retries reached, start dunning process
      subscription.status = SubscriptionStatus.PAST_DUE;
      
      await this.logEvent(
        subscription.id,
        SubscriptionEventType.DUNNING_STARTED,
        { billingCycleId: cycle.id }
      );

      // Send notification
      await this.notificationService.createNotification({
        title: "Payment Failed",
        message: `Subscription payment failed after ${subscription.maxRetries} attempts`,
        notificationType: NotificationType.MERCHANT,
        category: NotificationCategory.ERROR,
        recipientId: subscription.merchantId,
        metadata: { subscriptionId: subscription.subscriptionId },
      });
    }

    await this.billingCycleRepository.save(cycle);
    await this.subscriptionRepository.save(subscription);

    logError(error, undefined, {
      billingCycleId: cycle.id,
      subscriptionId: subscription.subscriptionId,
    });
  }

  private async createBillingCycle(subscription: Subscription): Promise<BillingCycle> {
    const cycle = new BillingCycle();
    cycle.subscriptionId = subscription.id;
    cycle.amount = subscription.amount;
    cycle.billingDate = subscription.nextBillingDate;
    cycle.dueDate = subscription.nextBillingDate;
    cycle.status = BillingCycleStatus.PENDING;

    // Update next billing date
    subscription.nextBillingDate = this.calculateNextBillingDate(
      subscription.nextBillingDate,
      subscription.billingInterval,
      subscription.intervalCount
    );
    await this.subscriptionRepository.save(subscription);

    return this.billingCycleRepository.save(cycle);
  }

  private calculateNextBillingDate(
    currentDate: Date,
    interval: BillingInterval,
    count: number
  ): Date {
    const nextDate = new Date(currentDate);

    switch (interval) {
      case BillingInterval.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * count));
        break;
      case BillingInterval.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + count);
        break;
      case BillingInterval.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + count);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + count);
    }

    return nextDate;
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff: 1 hour, 4 hours, 24 hours
    const delays = [3600000, 14400000, 86400000]; // in milliseconds
    return delays[Math.min(retryCount - 1, delays.length - 1)];
  }

  private async logEvent(
    subscriptionId: string,
    eventType: SubscriptionEventType,
    eventData?: Record<string, any>
  ): Promise<void> {
    const event = new SubscriptionEvent();
    event.subscriptionId = subscriptionId;
    event.eventType = eventType;
    event.eventData = eventData;
    await this.eventRepository.save(event);
  }
}