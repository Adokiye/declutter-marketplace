"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useCheckout, { type BaniPopUpType, type EventResponse } from "bani-react";
import { ChevronLeft, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing } from "@/lib/types";
import { formatCondition, formatNaira } from "@/lib/utils";

export function Checkout({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [baniReady, setBaniReady] = useState(false);
  const [platformDefaultMode, setPlatformDefaultMode] = useState<"escrow" | "fee_only_offline">("fee_only_offline");
  const { BaniPopUp } = useCheckout();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace(`/login?next=/checkout/${listingId}`);
    }
  }, [hydrated, user, listingId, router]);

  // The buyer never picks the mode — admin/business config decides it. Load the
  // platform default so the preview is correct when a listing has no business.
  useEffect(() => {
    let active = true;
    api.settings
      .all()
      .then((rows) => {
        const mode = rows.find((r) => r.key === "default_payment_mode")?.value?.mode;
        if (active && (mode === "escrow" || mode === "fee_only_offline")) setPlatformDefaultMode(mode);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const checkReady = () => {
      setBaniReady(typeof window !== "undefined" && typeof (window as Window & { BaniPopUp?: unknown }).BaniPopUp === "function");
    };
    checkReady();
    const timer = window.setInterval(checkReady, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.listings.get(listingId);
        if (!cancelled) setListing(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load listing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const paymentMode = useMemo<"escrow" | "fee_only_offline">(() => {
    return (listing?.business?.paymentMode as "escrow" | "fee_only_offline" | undefined) ?? platformDefaultMode;
  }, [listing?.business?.paymentMode, platformDefaultMode]);

  const feePercent = Number(listing?.business?.platformFeePercent ?? 5);
  const itemPrice = Number(listing?.priceNgn ?? 0);
  const platformFee = Math.round(itemPrice * (feePercent / 100));
  const totalDue = paymentMode === "escrow" ? itemPrice + platformFee : platformFee;

  async function submit() {
    if (!user || !listing) return;
    setSubmitting(true);
    setError(null);
    setPaymentNotice(null);
    let openedBani = false;
    try {
      const res = await api.orders.checkout({
        listingId: listing.id,
        buyerUserId: user.id,
        buyerEmail: email || user.email || ""
      });
      const checkoutParams = res.checkout?.checkoutParams;
      if (checkoutParams) {
        openedBani = true;
        setPaymentNotice("Complete the payment in the Bani window. This order will update after Bani confirms it.");
        const handleSuccess = async (response: EventResponse) => {
          const status = String(response.status ?? "").toLowerCase();
          if (status && !["success", "successful", "paid", "completed"].includes(status)) {
            setSubmitting(false);
            setError("Bani did not confirm this payment. Please try again.");
            return;
          }

          const reference = response.customer_ref ?? res.checkout.reference;
          await api.orders.verifyReference(reference).catch(() => null);
          router.push(`/orders/${res.orderId}`);
        };
        const handleClose = () => {
          setSubmitting(false);
          setPaymentNotice("Payment window closed. You can reopen Bani checkout when you're ready.");
        };
        const payload = {
          ...checkoutParams,
          metadata: {
            ...checkoutParams.metadata,
            custom_ref: res.checkout.reference,
            providerReference: res.checkout.reference,
            orderId: res.orderId,
            listingId: listing.id
          },
          callback: handleSuccess,
          onClose: handleClose
        };

        BaniPopUp(payload as BaniPopUpType);
        return;
      }

      const checkoutUrl = res.checkout?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      router.push(`/orders/${res.orderId}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Could not start checkout");
    } finally {
      if (!openedBani) setSubmitting(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
          <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </main>
    );
  }

  if (error && !listing) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <p className="text-lg font-semibold text-zinc-900">Checkout unavailable</p>
        <p className="mt-2 text-sm text-zinc-500">{error}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/marketplace"><ChevronLeft className="h-4 w-4" /> Back to marketplace</Link>
        </Button>
      </main>
    );
  }

  if (!listing) return null;

  const image = listing.images?.[0]?.url ?? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85";

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-black">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <section className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-60 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Confirm your order</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {paymentMode === "escrow"
              ? "Funds are held in escrow for 24 hours after payment. Tap “Item OK” once you’ve inspected the item to release them to the seller."
              : "You pay only the Declutter commission online. After payment we share the seller’s contact so you can arrange pickup and settle the item price with them directly."}
          </p>

          <div className="mt-6 flex gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white">
              <Image src={image} alt={listing.title} fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">{listing.title}</p>
              <p className="text-xs text-zinc-500">{listing.locationLabel} · {formatCondition(listing.condition)}</p>
              <p className="mt-2 text-sm font-bold text-zinc-950">{formatNaira(itemPrice)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Email for payment receipt
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="checkout-email"
            />
            {email && (
              <p className="text-xs text-zinc-500" data-testid="checkout-email-echo">
                Receipt will be sent to <span className="font-semibold text-zinc-900">{email}</span>.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Payment mode</p>
            <p className="mt-2 text-sm font-semibold text-zinc-950">
              {paymentMode === "escrow"
                ? `Pay commission + item value (${feePercent}% commission)`
                : `Pay the ${feePercent}% commission only`}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {paymentMode === "escrow"
                ? "You pay the item price plus the Declutter commission. Funds are held in escrow and released to the seller after the 24-hour inspection window."
                : "You pay only the Declutter commission now. Settle the item price with the seller directly when you collect the item."}
            </p>
          </div>

          {error && <p className="mt-4 text-sm text-zinc-900">{error}</p>}
          {paymentNotice && <p className="mt-4 text-sm text-zinc-600">{paymentNotice}</p>}

          <div className="sticky bottom-4 mt-6">
            <Button
              onClick={submit}
              disabled={submitting || !email || !baniReady}
              className="w-full scroll-mt-24"
              data-testid="checkout-pay"
              aria-label={`Pay ${formatNaira(totalDue)}`}
            >
              <Lock className="h-4 w-4" />
              {!baniReady ? "Loading Bani…" : submitting ? "Starting payment…" : `Pay ${formatNaira(totalDue)}`}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5" /> {paymentMode === "escrow" ? "Powered by Declutter Escrow" : "Secure payment by Declutter"}
            </p>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order summary</p>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Item price" value={formatNaira(itemPrice)} />
              <Row label={`Platform fee (${feePercent}%)`} value={formatNaira(platformFee)} />
              {paymentMode === "fee_only_offline" && (
                <Row label="Pay seller offline" value={formatNaira(itemPrice)} muted />
              )}
              <div className="border-t border-zinc-200 pt-3">
                <Row label="Total due now" value={formatNaira(totalDue)} emphasize />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            <p className="font-semibold text-zinc-900">How it works</p>
            {paymentMode === "escrow" ? (
              <ol className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
                <li>1. You pay through our provider — funds go into escrow.</li>
                <li>2. We reveal the seller&apos;s contact details for pickup or delivery.</li>
                <li>3. You inspect the item. Tap &quot;Item OK&quot; to release funds.</li>
                <li>4. If you do nothing within 24 hours, funds release automatically.</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
                <li>1. You pay the Declutter commission online.</li>
                <li>2. We reveal the seller&apos;s phone, WhatsApp, and pickup address.</li>
                <li>3. Chat with the seller and arrange pickup or delivery.</li>
                <li>4. Pay the seller the item price directly when you collect it.</li>
              </ol>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function Row({ label, value, emphasize, muted }: { label: string; value: string; emphasize?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-zinc-400 line-through" : "text-zinc-700"}`}>
      <span>{label}</span>
      <span className={emphasize ? "text-lg font-bold text-zinc-950" : "font-semibold"}>{value}</span>
    </div>
  );
}
