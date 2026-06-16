import { IsEmail, IsOptional, IsString, Length, Matches } from "class-validator";
import { Transform } from "class-transformer";
import { normalizePhone } from "./phone-normalizer";

export class RequestOtpDto {
  @Transform(({ value }) => normalizePhone(String(value ?? "")))
  @Matches(/^\+?[1-9]\d{6,15}$/, { message: "phone must be a valid phone number" })
  phone!: string;
}

export class VerifyOtpDto {
  @Transform(({ value }) => normalizePhone(String(value ?? "")))
  @Matches(/^\+?[1-9]\d{6,15}$/, { message: "phone must be a valid phone number" })
  phone!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}

export class CompleteProfileDto {
  @Transform(({ value }) => normalizePhone(String(value ?? "")))
  @Matches(/^\+?[1-9]\d{6,15}$/, { message: "phone must be a valid phone number" })
  phone!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  role?: "buyer" | "seller";
}
