import cron from "node-cron";
import { SubscriptionService } from "../services/SubscriptionService";
import { logInfo, logError } from "./logger";

export class SubscriptionScheduler {
  private subscriptionService: SubscriptionService;
  private isRunning: boolean = false;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  start(): void {
    if (this.isRunning) {
      logInfo("Subscription scheduler is already running");
      return;
    }

    // Run every 10 minutes
    cron.schedule("*/10 * * * *", async () => {
      await this.processScheduledPayments();
    });

    this.isRunning = true;
    logInfo("Subscription scheduler started");
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    cron.getTasks().forEach((task) => {
      task.stop();
    });

    this.isRunning = false;
    logInfo("Subscription scheduler stopped");
  }

  private async processScheduledPayments(): Promise<void> {
    try {
      logInfo("Processing scheduled payments");
      await this.subscriptionService.processScheduledPayments();
      logInfo("Scheduled payments processing completed");
    } catch (error) {
      logError(error as Error, undefined, {
        context: "subscription_scheduler",
        operation: "process_scheduled_payments",
      });
    }
  }
}

export const subscriptionScheduler = new SubscriptionScheduler();