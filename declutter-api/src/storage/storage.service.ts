import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

export type UploadInput = {
  buffer: Buffer;
  mimetype: string;
  filename?: string;
  folder?: string;
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};

function cleanConfigValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes("<") || trimmed.includes(">")) return undefined;
  return trimmed;
}

@Injectable()
export class StorageService {
  private readonly log = new Logger("Storage");
  private readonly useCloudinary: boolean;
  private readonly uploadsDir = join(process.cwd(), "uploads");
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const url = cleanConfigValue(config.get<string>("CLOUDINARY_URL"));
    const cloudName = cleanConfigValue(config.get<string>("CLOUDINARY_CLOUD_NAME"));
    const apiKey = cleanConfigValue(config.get<string>("CLOUDINARY_API_KEY"));
    const apiSecret = cleanConfigValue(config.get<string>("CLOUDINARY_API_SECRET"));

    if (url) {
      const parsed = new URL(url);
      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: decodeURIComponent(parsed.username),
        api_secret: decodeURIComponent(parsed.password),
        secure: true
      });
      this.useCloudinary = true;
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      this.useCloudinary = true;
    } else {
      this.useCloudinary = false;
    }

    const port = config.get<string>("PORT") ?? "4000";
    this.publicBaseUrl = (config.get<string>("PUBLIC_BASE_URL") ?? `http://localhost:${port}`).replace(/\/$/, "");
    this.log.log(`storage backend=${this.useCloudinary ? "cloudinary" : "local-disk"}`);
  }

  /** True when files are written to the local uploads/ dir (so main.ts can serve them statically). */
  get isLocal() {
    return !this.useCloudinary;
  }

  get isCloudinary() {
    return this.useCloudinary;
  }

  get localDir() {
    return this.uploadsDir;
  }

  async uploadBuffer(input: UploadInput): Promise<{ url: string }> {
    if (this.useCloudinary) {
      const folder = input.folder ?? "declutter";
      const url = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image" },
          (err, result) => {
            if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
            resolve(result.secure_url);
          }
        );
        stream.end(input.buffer);
      });
      return { url };
    }

    // Local-disk fallback.
    const ext = MIME_EXT[input.mimetype?.toLowerCase()] ?? "jpg";
    const name = `${randomUUID()}.${ext}`;
    await mkdir(this.uploadsDir, { recursive: true });
    await writeFile(join(this.uploadsDir, name), input.buffer);
    return { url: `${this.publicBaseUrl}/uploads/${name}` };
  }

  /** Download a remote image and persist it via the active backend. Used by the IG scraper. */
  async uploadFromUrl(remoteUrl: string, folder?: string): Promise<string> {
    const res = await fetch(remoteUrl);
    if (!res.ok) throw new Error(`fetch ${remoteUrl} failed: ${res.status}`);
    const mimetype = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    const { url } = await this.uploadBuffer({ buffer, mimetype, folder: folder ?? "declutter/instagram" });
    return url;
  }
}
