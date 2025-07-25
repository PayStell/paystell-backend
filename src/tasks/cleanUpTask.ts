import cron from "node-cron";
import { FileMetadata } from "src/models/fileMetaData.model";
import { FileUploadService } from "../services/fileUpload.service";
import AppDataSource from "src/config/db";

export function startCleanupJob() {
  const fileUploadService = new FileUploadService();
  const fileRepo = AppDataSource.getRepository(FileMetadata);

  cron.schedule("0 2 * * *", async () => {
    console.log(`[Cleanup Job] Running cleanup at ${new Date().toISOString()}`);

    try {
      const batchSize = 100;
      let skip = 0;
      let hasMore = true;
      const allFiles: FileMetadata[] = [];

      while (hasMore) {
        const files = await fileRepo.find({
          skip,
          take: batchSize,
        });

        if (files.length === 0) {
          hasMore = false;
          continue;
        }

        allFiles.push(...files);
        skip += batchSize;
      }

      for (const file of allFiles) {
        const eligibleForDeletion = await isFileEligibleForDeletion(file);
        if (eligibleForDeletion) {
          console.log(`[Cleanup Job] Deleting orphaned file: ${file.filename}`);
          await fileUploadService.deleteFile(file.filename);

          await fileRepo.remove(file);
        }
      }

      console.log("[Cleanup Job] Completed successfully.");
    } catch (error) {
      console.error("[Cleanup Job] Error during cleanup:", error);
    }
  });
}

async function isFileEligibleForDeletion(file: FileMetadata): Promise<boolean> {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const age = Date.now() - file.uploadedAt.getTime();

  if (age <= THIRTY_DAYS_MS || file.tags.includes("important")) {
    return false;
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const isReferenced = await queryRunner.manager
      .createQueryBuilder()
      .select("1")
      .from("user_documents", "ud")
      .where("ud.file_id = :id", { id: file.id })
      .getRawOne();

    return !isReferenced;
  } catch (err) {
    console.error("[Cleanup Job] Error checking file references:", err);

    return false;
  } finally {
    await queryRunner.release();
  }
}
