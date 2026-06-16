import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { INSTAGRAM_QUEUE, InstagramImportService } from "./instagram-import.service";

@Processor(INSTAGRAM_QUEUE)
export class InstagramProcessor extends WorkerHost {
  constructor(private readonly imports: InstagramImportService) {
    super();
  }

  async process(job: Job<{ businessId: string; limit?: number }>) {
    if (job.name === "sync-business") {
      return this.imports.syncBusiness(job.data.businessId, job.data.limit);
    }
    return { skipped: true };
  }
}
