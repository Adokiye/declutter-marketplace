import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function checkoutTotal(price: number, paymentMode: "escrow" | "fee_only_offline", feePercent = 5) {
  const platformFee = Math.round(price * (feePercent / 100));
  return {
    itemPrice: price,
    platformFee,
    totalDue: paymentMode === "escrow" ? price + platformFee : platformFee
  };
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

/** Short posted date as dd/mm/yyyy. */
export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Customer-facing "posted" date: the original post date (Instagram date or when a
 * seller listing went live), falling back to approval/creation time.
 */
export function displayDate(listing: { postedAt?: string | null; approvedAt?: string | null; createdAt?: string | null }) {
  return formatDate(listing.postedAt ?? listing.approvedAt ?? listing.createdAt ?? null);
}

export function countdownParts(targetIso: string | null | undefined, nowMs?: number) {
  if (!targetIso) return null;
  const now = nowMs ?? Date.now();
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false
  };
}

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Brand new",
  like_new: "Like new",
  "like-new": "Like new",
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  used: "Used",
  refurbished: "Refurbished",
  for_parts: "For parts"
};

// Turns raw condition codes (e.g. "like_new") into customer-friendly labels.
export function formatCondition(condition?: string | null) {
  if (!condition) return "";
  const key = condition.toLowerCase().trim();
  if (CONDITION_LABELS[key]) return CONDITION_LABELS[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
