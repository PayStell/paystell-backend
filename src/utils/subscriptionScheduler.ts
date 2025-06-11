import cron from "node-cron";
import { SubscriptionService } from "../services/SubscriptionService";
import { logInfo, logError } from "./logger";

export class SubscriptionScheduler {
  private subscriptionService: SubscriptionService;
  private isRunning: boolean = false;
  private cronTasks: any[] = [];

  constructor(subscriptionService?: SubscriptionService) {
    this.subscriptionService = subscriptionService || new SubscriptionService();
  }

  start(): void {
    if (this.isRunning) {
      logInfo("Subscription scheduler is already running");
      return;
    }

    this.isRunning = true;

    // Run every 10 minutes
    const task = cron.schedule("*/10 * * * *", async () => {
      await this.processScheduledPayments();
    });
    this.cronTasks.push(task);

    logInfo("Subscription scheduler started");
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.cronTasks.forEach((task) => {
      task.stop();
    });
    this.cronTasks = [];

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