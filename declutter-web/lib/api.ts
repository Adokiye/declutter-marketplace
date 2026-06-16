import type {
  AdminMetrics,
  AuthSession,
  Business,
  Category,
  ChatMessage,
  ChatThread,
  CheckoutResponse,
  Escrow,
  Listing,
  Order,
  OtpRequestResponse,
  OtpVerifyResponse,
  Paginated,
  PlatformSetting,
  SellerBalance,
  User
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "declutter.access_token";
const SESSION_KEY = "declutter.session";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, session.tokens.accessToken);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestOpts = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
};

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;

  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (json && (json.message || json.error)) ||
      `Request failed (${response.status})`;
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : String(message),
      response.status,
      json
    );
  }
  return json as T;
}

export const api = {
  auth: {
    requestOtp: (phone: string) =>
      request<OtpRequestResponse>("/auth/otp/request", {
        method: "POST",
        body: { phone },
        auth: false
      }),
    verifyOtp: (phone: string, otp: string) =>
      request<OtpVerifyResponse>("/auth/otp/verify", {
        method: "POST",
        body: { phone, otp },
        auth: false
      }),
    completeProfile: (input: {
      phone: string;
      firstName: string;
      lastName: string;
      email: string;
      role?: "buyer" | "seller";
    }) =>
      request<{ user: User; tokens: AuthSession["tokens"] }>(
        "/auth/profile",
        { method: "POST", body: input, auth: false }
      )
  },
  listings: {
    search: (query: Record<string, string | number | undefined> = {}) =>
      request<Paginated<Listing>>("/listings", { query }),
    get: (id: string) => request<Listing>(`/listings/${id}`),
    create: (input: {
      sellerUserId: string;
      title: string;
      description: string;
      condition: string;
      brand?: string;
      isDistressSale?: boolean;
      priceNgn: number;
      locationLabel: string;
      city?: string;
      state?: string;
      categoryId?: string;
      businessId?: string;
      imageUrls: string[];
    }) =>
      request<Listing>("/listings", {
        method: "POST",
        body: input
      }),
    sellerStats: (sellerUserId: string) =>
      request<Record<string, number>>(
        `/listings/seller/${sellerUserId}/stats`
      )
  },
  orders: {
    checkout: (input: {
      listingId: string;
      buyerUserId: string;
      buyerEmail: string;
    }) =>
      request<CheckoutResponse>("/orders/checkout", {
        method: "POST",
        body: input
      }),
    list: (query: Record<string, string | number | undefined> = {}) =>
      request<Paginated<Order>>("/orders", { query }),
    get: (id: string) => request<Order>(`/orders/${id}`),
    itemOk: (id: string) =>
      request<Order>(`/orders/${id}/item-ok`, { method: "POST" }),
    verifyReference: (reference: string) =>
      request<Order>(`/orders/payments/bani/verify/${reference}`, {
        method: "POST"
      })
  },
  payouts: {
    balance: (sellerUserId: string) =>
      request<SellerBalance>(`/payouts/sellers/${sellerUserId}/balance`),
    request: (
      sellerUserId: string,
      input: { amountNgn: number; bankAccountId?: string }
    ) =>
      request(`/payouts/sellers/${sellerUserId}/request`, {
        method: "POST",
        body: input
      }),
    createBankAccount: (input: {
      userId: string;
      bankName: string;
      bankCode?: string;
      accountNumber: string;
      accountName: string;
      isDefault?: boolean;
    }) =>
      request("/payouts/bank-accounts", {
        method: "POST",
        body: input
      })
  },
  admin: {
    metrics: () => request<AdminMetrics>("/admin/metrics"),
    escrows: (query: Record<string, string | number | undefined> = {}) =>
      request<Paginated<Escrow & { listing?: Listing; buyer?: User; seller?: User }>>(
        "/admin/escrows",
        { query }
      ),
    banUser: (id: string) =>
      request<User>(`/admin/users/${id}/ban`, { method: "PATCH" }),
    unbanUser: (id: string) =>
      request<User>(`/admin/users/${id}/unban`, { method: "PATCH" }),
    approveListing: (id: string, adminUserId: string, igPostUrl?: string) =>
      request<Listing>(`/admin/listings/${id}/approve`, {
        method: "PATCH",
        body: { adminUserId, igPostUrl }
      }),
    rejectListing: (id: string) =>
      request<Listing>(`/admin/listings/${id}/reject`, { method: "PATCH" })
  },
  instagram: {
    sync: (businessId: string, limit?: number) =>
      request<{ queued: boolean; businessId: string; limit: number | null }>(
        `/instagram/businesses/${businessId}/sync${limit ? `?limit=${limit}` : ""}`,
        { method: "POST" }
      )
  },
  businesses: {
    list: (query: Record<string, string | number | undefined> = {}) =>
      request<Paginated<Business>>("/businesses", { query }),
    bySlug: (slug: string) =>
      request<Business>(`/businesses/slug/${slug}`),
    updateSettings: (id: string, input: Partial<Business>) =>
      request<Business>(`/businesses/${id}/settings`, {
        method: "PATCH",
        body: input
      })
  },
  users: {
    list: (query: Record<string, string | number | undefined> = {}) =>
      request<Paginated<User>>("/users", { query }),
    get: (id: string) => request<User>(`/users/${id}`)
  },
  uploads: {
    // Multipart upload — bypasses the JSON `request()` so the browser sets the
    // multipart boundary itself. Keeps the bearer token.
    create: async (files: File[]): Promise<{ urls: string[] }> => {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const token = getStoredToken();
      const res = await fetch(`${BASE_URL}/uploads`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const message = (json && (json.message || json.error)) || `Upload failed (${res.status})`;
        throw new ApiError(Array.isArray(message) ? message.join(", ") : String(message), res.status, json);
      }
      return json as { urls: string[] };
    }
  },
  categories: {
    list: () => request<Category[]>("/categories", { auth: false })
  },
  settings: {
    all: () => request<PlatformSetting[]>("/settings", { auth: false }),
    setPlatformFee: (percent: number) =>
      request<PlatformSetting[]>("/settings/platform-fee", {
        method: "PUT",
        body: { percent }
      }),
    setDefaultPaymentMode: (mode: "escrow" | "fee_only_offline") =>
      request<PlatformSetting[]>("/settings/default-payment-mode", {
        method: "PUT",
        body: { mode }
      })
  },
  chat: {
    threads: (orderId: string) =>
      request<ChatThread[]>(`/chat/orders/${orderId}/threads`),
    messages: (threadId: string, query: Record<string, string | number | undefined> = {}) =>
      request<Paginated<ChatMessage>>(`/chat/threads/${threadId}/messages`, { query }),
    send: (
      threadId: string,
      input: { senderUserId: string; senderRole: ChatMessage["senderRole"]; body: string }
    ) =>
      request<ChatMessage>(`/chat/threads/${threadId}/messages`, {
        method: "POST",
        body: input
      }),
    markRead: (threadId: string, userId: string) =>
      request<{ ok: boolean }>(`/chat/threads/${threadId}/read`, {
        method: "PATCH",
        body: { userId }
      })
  }
};
