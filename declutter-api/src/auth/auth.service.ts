import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserModel } from "../database/models";
import { CompleteProfileDto, VerifyOtpDto } from "./dto";

const STATIC_OTP = "000000";

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async requestOtp(phone: string) {
    const user = await UserModel.query()
      .insert({ phone, role: "buyer", isPhoneVerified: false, isBanned: false })
      .onConflict("phone")
      .merge({ updatedAt: new Date().toISOString() })
      .returning("*");

    return {
      userId: user.id,
      phone,
      otpMode: "static",
      devOtp: STATIC_OTP
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    if (dto.otp !== STATIC_OTP) {
      throw new UnauthorizedException("Invalid OTP");
    }

    const user = await UserModel.query().patchAndFetchById(
      (await this.findByPhoneOrFail(dto.phone)).id,
      { isPhoneVerified: true, lastLoginAt: new Date().toISOString() }
    );

    return {
      verified: true,
      needsProfile: !user.firstName || !user.lastName || !user.email,
      user,
      tokens: this.tokens(user.id, user.role)
    };
  }

  async completeProfile(dto: CompleteProfileDto) {
    const user = await this.findByPhoneOrFail(dto.phone);
    if (!user.isPhoneVerified) {
      throw new BadRequestException("Phone number must be verified before completing profile");
    }

    const patched = await UserModel.query().patchAndFetchById(user.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: dto.role ?? user.role ?? "buyer"
    });

    return {
      user: patched,
      tokens: this.tokens(patched.id, patched.role)
    };
  }

  private async findByPhoneOrFail(phone: string) {
    const user = await UserModel.query().findOne({ phone });
    if (!user) throw new BadRequestException("Phone not found. Request OTP first.");
    if (user.isBanned) throw new UnauthorizedException("Account is banned");
    return user;
  }

  private tokens(userId: string, role: string) {
    return {
      accessToken: this.jwt.sign({ sub: userId, role }, { expiresIn: "1h" }),
      refreshToken: this.jwt.sign({ sub: userId, role, type: "refresh" }, { expiresIn: "30d" })
    };
  }
}
