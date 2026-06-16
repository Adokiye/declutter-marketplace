export type UserRole = "buyer" | "seller" | "admin";

export type User = {
  id: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role: UserRole;
  isPhoneVerified: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  user: User;
  tokens: Tokens;
};

export type ListingImage = {
  id: string;
  listingId: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  storefrontTheme: "belo-fur" | "lefore" | "emox";
  paymentMode: "escrow" | "fee_only_offline";
  platformFeePercent: string;
  igProfileUrl?: string | null;
  igImportEnabled: boolean;
  igImportMode: "draft" | "live";
};

export type Listing = {
  id: string;
  businessId?: string | null;
  sellerUserId: string;
  categoryId?: string | null;
  title: string;
  description: string;
  condition: string;
  brand?: string | null;
  priceNgn: string;
  isDistressSale?: boolean;
  isGoodDeal?: boolean;
  dealScore?: string | null;
  referencePriceNgn?: string | null;
  status: "draft" | "active" | "sold" | "archived";
  moderationStatus: "pending" | "approved" | "rejected";
  locationLabel: string;
  city?: string | null;
  state?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  source: "manual" | "instagram";
  createdAt: string;
  approvedAt?: string | null;
  postedAt?: string | null;
  soldAt?: string | null;
  images?: ListingImage[];
  category?: Category | null;
  business?: Business | null;
  seller?: User | null;
};

export type Escrow = {
  id: string;
  orderId: string;
  status: "held" | "released" | "disputed" | "refunded";
  heldAmountNgn: string;
  platformFeeNgn: string;
  releaseAfterAt: string;
  releasedAt?: string | null;
};

export type Order = {
  id: string;
  businessId?: string | null;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  paymentMode: "escrow" | "fee_only_offline";
  status:
    | "pending_payment"
    | "escrow_paid"
    | "fee_paid"
    | "completed"
    | "disputed"
    | "refunded"
    | "cancelled";
  itemPriceNgn: string;
  platformFeePercent: string;
  platformFeeNgn: string;
  amountDueNgn: string;
  paymentProvider: string;
  providerReference: string;
  providerStatus: string;
  providerPayload: Record<string, unknown>;
  paidAt?: string | null;
  sellerContactRevealedAt?: string | null;
  inspectionDeadlineAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  listing?: Listing;
  buyer?: User;
  seller?: User;
  escrow?: Escrow | null;
};

export type ChatThreadType = "declutter_buyer" | "declutter_seller" | "buyer_seller";

export type ChatMessage = {
  id: string;
  threadId: string;
  senderUserId: string;
  senderRole: "buyer" | "seller" | "admin" | "support";
  body: string;
  readAt?: string | null;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  orderId: string;
  type: ChatThreadType;
  buyerUserId?: string | null;
  sellerUserId?: string | null;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  buyer?: User | null;
  seller?: User | null;
  messages?: ChatMessage[];
};

export type PlatformSetting = {
  id: string;
  key: string;
  value: Record<string, unknown>;
};

export type Paginated<T> = {
  results: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type AdminMetrics = {
  totalUsers: number;
  activeBuyers: number;
  activeSellers: number;
  activeListings: number;
  totalOrders: number;
  gmvNgn: number;
  feesCollectedNgn: number;
};

export type SellerBalance = {
  releasedEscrowBalanceNgn: number;
  payoutLockedNgn: number;
  availableBalanceNgn: number;
};

export type CheckoutResponse = {
  orderId: string;
  checkout: {
    checkoutUrl?: string;
    checkoutParams?: {
      amount: string;
      phoneNumber: string;
      email: string;
      firstName: string;
      lastName: string;
      merchantKey: string;
      bankTransfer?: boolean;
      metadata: Record<string, unknown>;
    };
    reference: string;
    providerPayload: Record<string, unknown>;
  };
};

export type OtpRequestResponse = {
  userId: string;
  phone: string;
  otpMode: string;
  devOtp?: string;
};

export type OtpVerifyResponse = {
  verified: boolean;
  needsProfile: boolean;
  user: User;
  tokens: Tokens;
};
