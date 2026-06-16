import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { StorageService } from "../storage/storage.service";

const MAX_FILES = 10;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file

type UploadedFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };

@Controller("uploads")
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, {
      limits: { fileSize: MAX_BYTES, files: MAX_FILES }
    })
  )
  async upload(@UploadedFiles() files: UploadedFile[]) {
    if (!files?.length) throw new BadRequestException("No files uploaded");
    for (const file of files) {
      if (!file.mimetype?.startsWith("image/")) {
        throw new BadRequestException(`Unsupported file type: ${file.mimetype || "unknown"}`);
      }
    }
    const urls = await Promise.all(
      files.map((file) =>
        this.storage
          .uploadBuffer({ buffer: file.buffer, mimetype: file.mimetype, filename: file.originalname, folder: "declutter/listings" })
          .then((r) => r.url)
      )
    );
    return { urls };
  }
}
