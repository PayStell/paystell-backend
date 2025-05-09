import "reflect-metadata";
import { AppDataSource } from "./config/db";
import { app } from "./app";
import { EntityAuditSubscriber } from "./entities/subscribers/entity.subscriber";

async function main() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully");

    const subscriber = new EntityAuditSubscriber(AppDataSource);
    AppDataSource.subscribers.push(subscriber);

    // Start the server
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    process.exit(1); // Exit the process if the database fails to initialize
  }
}

main();
