import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { StorageService } from "./storage/storage.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";

  app.enableCors({
    origin: frontendUrl.split(",").map((origin) => origin.trim()),
    credentials: true
  });

  // Serve locally-stored uploads when Cloudinary isn't configured (dev fallback).
  const storage = app.get(StorageService);
  if (storage.isLocal) {
    app.useStaticAssets(storage.localDir, { prefix: "/uploads" });
  }

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(config.get<number>("PORT") ?? 4000);
}

void bootstrap();
