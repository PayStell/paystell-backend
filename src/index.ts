import "reflect-metadata";
import app from "./app";
import AppDataSource from "./config/db";

async function main() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully");

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
