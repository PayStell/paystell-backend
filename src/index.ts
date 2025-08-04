import "reflect-metadata";
import app from "./app";
import AppDataSource from "./config/db";
import { configurationService } from "./services/ConfigurationService";
import adaptiveRateLimitService from "./services/adaptiveRateLimitService";

async function main() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully");

    // Initialize configuration service
    await configurationService.initialize();
    console.log("✅ Configuration service initialized successfully");

    // Start adaptive rate limit adjustment
    adaptiveRateLimitService.startAdjustment();

    // Start the server
    const PORT = process.env.PORT || 4000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is listening on port ${PORT}`);
      console.log(
        `📚 API Documentation available at: http://localhost:${PORT}/api-docs`,
      );
    });

    // Handle server startup errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log("💡 Try running: lsof -ti:4000 | xargs kill -9");
      } else {
        console.error("❌ Server error:", error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main();
