import cron from "node-cron";
import sessionService from "../services/session.service";

export const startExpiredSessionCleanupCronJobs = () => {
  // Schedule session cleanup every hour
  cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running session cleanup...");
    await sessionService.cleanupExpiredSessions();
  });

  console.log("✅ Cron jobs initialized!");
};
