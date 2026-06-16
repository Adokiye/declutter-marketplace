import { Injectable } from "@nestjs/common";
import { normalizePagination, toPaginated } from "../common/pagination";
import { BusinessMemberModel, BusinessModel } from "../database/models";
import { SettingsService } from "../settings/settings.service";
import { CreateBusinessDto, UpdateBusinessSettingsDto } from "./dto";

@Injectable()
export class BusinessesService {
  constructor(private readonly settings: SettingsService) {}

  async create(dto: CreateBusinessDto) {
    const defaultPaymentMode = await this.settings.getDefaultPaymentMode();
    const business = await BusinessModel.query().insert({
      ownerUserId: dto.ownerUserId,
      name: dto.name,
      slug: dto.slug,
      storefrontTheme: dto.storefrontTheme ?? "emox",
      paymentMode: defaultPaymentMode,
      igImportEnabled: false,
      igImportMode: "draft",
      brandSettings: {},
      isActive: true
    });

    await BusinessMemberModel.query().insert({
      businessId: business.id,
      userId: dto.ownerUserId,
      role: "owner"
    });

    return business;
  }

  async list(query: { page?: number; limit?: number }) {
    const { page, limit } = normalizePagination(query);
    const results = await BusinessModel.query().orderBy("createdAt", "desc").page(page - 1, limit);
    return toPaginated(results, page, limit);
  }

  getBySlug(slug: string) {
    return BusinessModel.query().findOne({ slug }).throwIfNotFound();
  }

  getById(id: string) {
    return BusinessModel.query().findById(id).throwIfNotFound();
  }

  updateSettings(id: string, dto: UpdateBusinessSettingsDto) {
    return BusinessModel.query().patchAndFetchById(id, {
      ...dto,
      platformFeePercent: dto.platformFeePercent === undefined ? undefined : dto.platformFeePercent.toFixed(2)
    });
  }
}
