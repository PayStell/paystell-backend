import cron from "node-cron";
import { FileMetadata } from "src/models/fileMetaData.model";
import { FileUploadService } from "../services/fileUpload.service";
export function startCleanupJob() {
  const fileUploadService = new FileUploadService();

  cron.schedule("0 2 * * *", async () => {
    console.log(`[Cleanup Job] Running cleanup at ${new Date().toISOString()}`);

    try {
      const allFiles = await FileMetadata.find({});

      for (const file of allFiles) {
        const isReferenced = await checkIfFileIsReferenced(file);
        if (!isReferenced) {
          console.log(`[Cleanup Job] Deleting orphaned file: ${file.filename}`);

          await fileUploadService.deleteFile(file.filename);
        }
      }
      console.log("[Cleanup Job] Completed successfully.");
    } catch (error) {
      console.error("[Cleanup Job] Error during cleanup:", error);
    }
  });
}

async function checkIfFileIsReferenced(file: FileMetadata) {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const age = Date.now() - file.uploadedAt.getTime();

  if (age > THIRTY_DAYS_MS && !file.tags.includes("important")) {
    return false;
  }
  return true;
}
