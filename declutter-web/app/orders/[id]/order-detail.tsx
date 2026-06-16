"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, Clock3, Loader2, MapPin, MessageCircle, PackageCheck, Phone, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderChat } from "@/components/order-chat";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/lib/types";
import { telHref, whatsappHref } from "@/lib/phone";
import { countdownParts, formatCondition, formatDateTime, formatNaira, pad } from "@/lib/utils";

export function OrderDetail({ id }: { id: string }) {
  const { user, hydrated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.orders.get(id);
        if (!cancelled) setOrder(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (order?.status !== "pending_payment") return;
    const timer = window.setInterval(async () => {
      const updated = await api.orders.get(id).catch(() => null);
      if (updated) setOrder(updated);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [id, order?.status]);

  async function markOk() {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await api.orders.itemOk(order.id);
      setOrder(updated);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Could not release funds");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !hydrated) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-16">
        <div className="h-72 animate-pulse rounded-3xl bg-zinc-100" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <p className="text-lg font-semibold text-zinc-900">Order not found</p>
        <p className="mt-2 text-sm text-zinc-500">{error ?? "The order may have been removed."}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/orders"><ChevronLeft className="h-4 w-4" /> Back to orders</Link>
        </Button>
      </main>
    );
  }

  const listing = order.listing;
  const image = listing?.images?.[0]?.url ?? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85";
  const isBuyer = user?.id === order.buyerUserId;
  const isSeller = user?.id === order.sellerUserId;
  const contactRevealed = !!order.sellerContactRevealedAt;
  const countdown = order.inspectionDeadlineAt ? countdownParts(order.inspectionDeadlineAt, now) : null;
  const escrowActive = order.paymentMode === "escrow" && order.status === "escrow_paid";

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-black">
          <ChevronLeft className="h-4 w-4" /> All orders
        </Link>
      </div>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order {order.id.slice(0, 8)}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{listing?.title ?? "Listing"}</h1>
              <p className="mt-1 text-xs text-zinc-500">Placed {formatDateTime(order.createdAt)}</p>
            </div>
            <StatusPill status={order.status} />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className="relative aspect-[4/3] w-full bg-zinc-100">
              <Image
                src={image}
                alt={listing?.title ?? "Item"}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
                priority
              />
            </div>
            {listing?.images && listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto bg-white p-3">
                {listing.images.slice(0, 6).map((img) => (
                  <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
            <div className="p-4">
              <p className="text-sm font-semibold text-zinc-950">{listing?.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{listing?.locationLabel} · {formatCondition(listing?.condition)}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <Stat label="Item" value={formatNaira(order.itemPriceNgn)} />
                <Stat label={`Fee (${order.platformFeePercent}%)`} value={formatNaira(order.platformFeeNgn)} />
                <Stat label="You paid" value={formatNaira(order.amountDueNgn)} bold />
              </div>
            </div>
          </div>

          {escrowActive && (
            <div className="mt-6 rounded-2xl border border-zinc-300 bg-zinc-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-300">
                  <Clock3 className="h-4 w-4" /> Inspection window
                </div>
                <span className="text-xs text-zinc-400">Releases {formatDateTime(order.inspectionDeadlineAt)}</span>
              </div>
              {countdown && !countdown.expired ? (
                <div className="mt-4 flex items-baseline gap-3 font-mono text-5xl font-bold tracking-tight">
                  <span>{pad(countdown.hours)}</span>
                  <span className="text-zinc-500">:</span>
                  <span>{pad(countdown.minutes)}</span>
                  <span className="text-zinc-500">:</span>
                  <span>{pad(countdown.seconds)}</span>
                </div>
              ) : (
                <p className="mt-4 text-xl font-semibold">Window expired · funds will release automatically.</p>
              )}
              <p className="mt-3 text-xs text-zinc-400">
                If everything looks good, release the funds now. If the inspection passes silently, funds are released automatically when the timer ends.
              </p>
              {isBuyer && (
                <Button
                  variant="secondary"
                  onClick={markOk}
                  disabled={actionLoading}
                  className="mt-5 bg-white text-black hover:bg-zinc-100"
                  data-testid="order-item-ok"
                  aria-label="Release escrow funds — item received OK"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  {actionLoading ? "Releasing…" : "Item OK · release funds"}
                </Button>
              )}
            </div>
          )}

          {order.status === "completed" && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <CheckCircle2 className="h-5 w-5 text-zinc-900" />
              Order completed{order.completedAt ? ` on ${formatDateTime(order.completedAt)}` : ""}.
            </div>
          )}

          {order.status === "pending_payment" && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              Waiting for payment confirmation. If you closed the payment window,&nbsp;
              <Link href={`/checkout/${order.listingId}`} className="font-semibold text-zinc-900 underline">resume checkout</Link>.
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Store className="h-4 w-4" /> Seller
            </div>
            {order.seller && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                    {(order.seller.firstName ?? order.seller.phone).slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">
                      {order.seller.firstName?.trim() || order.seller.lastName?.trim() || "Verified seller"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {contactRevealed ? "Contact unlocked — arrange your pickup." : "Contact unlocks after payment is confirmed."}
                    </p>
                  </div>
                </div>

                {contactRevealed ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{[listing?.locationLabel, listing?.city, listing?.state].filter(Boolean).join(", ") || "Pickup location shared by seller"}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <a href={telHref(order.seller.phone)} aria-label="Call seller"><Phone className="h-4 w-4" /> Call</a>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <a
                          href={whatsappHref(order.seller.phone, `Hi, about Declutter order #${order.id.slice(0, 8)}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Message seller on WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                      </Button>
                    </div>
                    <p className="text-center text-[11px] text-zinc-400">{order.seller.phone}</p>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-zinc-200 p-3 text-xs text-zinc-500">
                    Complete payment to unlock the seller&apos;s phone, WhatsApp, and pickup address.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <ShieldCheck className="h-4 w-4" /> Protections
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
              {order.paymentMode === "escrow" && <li>· Funds held in escrow for 24 hours after payment.</li>}
              <li>· Seller contact revealed only after a successful payment.</li>
              <li>· Something wrong? Message Declutter support in the order chat — we&apos;ll step in.</li>
            </ul>
          </section>

          {isSeller && (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Seller view</p>
              <p className="mt-2 text-sm text-zinc-700">
                Funds {order.status === "escrow_paid" ? "are escrowed" : order.status === "completed" ? "have been released" : "are pending"}.
                You will receive them in your next payout cycle.
              </p>
              <Button asChild variant="secondary" className="mt-4 w-full">
                <Link href="/seller/payouts">Manage payouts</Link>
              </Button>
            </section>
          )}
        </aside>
      </section>

      <OrderChat order={order} />
    </main>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const text =
    status === "pending_payment" ? "Awaiting payment" :
    status === "escrow_paid" ? "In escrow" :
    status === "fee_paid" ? "Fee paid" :
    status === "completed" ? "Completed" :
    status === "disputed" ? "Disputed" :
    status === "refunded" ? "Refunded" : status;
  return (
    <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
      {text}
    </span>
  );
}

function Stat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 ${bold ? "font-bold text-zinc-950" : "font-semibold text-zinc-800"}`}>{value}</p>
    </div>
  );
}
