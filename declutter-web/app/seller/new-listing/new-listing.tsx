"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { categories } from "@/lib/data";

const CONDITIONS = ["new", "like_new", "good", "fair", "for_parts"];

export function NewListing() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?next=/seller/new-listing");
  }, [hydrated, user, router]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceNgn, setPriceNgn] = useState("");
  const [condition, setCondition] = useState("good");
  const [brand, setBrand] = useState("");
  const [isDistressSale, setIsDistressSale] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Lagos");
  const [city, setCity] = useState("Lagos");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setUploading(true);
    try {
      const { urls } = await api.uploads.create(Array.from(fileList));
      setImages((current) => [...current, ...urls]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload images");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  function makeCover(index: number) {
    setImages((current) => {
      if (index === 0) return current;
      const next = [...current];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (images.length === 0) {
      setError("Add at least one photo.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.listings.create({
        sellerUserId: user.id,
        title: title.trim(),
        description: description.trim(),
        condition,
        brand: brand.trim() || undefined,
        isDistressSale,
        priceNgn: Number(priceNgn),
        locationLabel: locationLabel.trim(),
        city: city.trim(),
        imageUrls: images
      });
      router.push(`/listings/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Could not create listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || !user) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-canvas">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </main>
    );
  }

  return (
    <main className="bg-canvas">
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-black">
          <ChevronLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950">Sell an item</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Share clear photos and an honest description. Listings are reviewed before going live, then appear in your{" "}
          <Link href="/seller/listings" className="font-semibold text-brand hover:underline">seller dashboard</Link>.
        </p>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 pb-16">
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6">
          <Field label="Title">
            <Input
              name="title"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <Field label="Description">
            <Input
              name="description"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="h-28 rounded-2xl py-3"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Price (₦)">
              <Input
                type="number"
                name="price"
                placeholder="Price"
                inputMode="decimal"
                value={priceNgn}
                onChange={(e) => setPriceNgn(e.target.value)}
                required
                min={1}
              />
            </Field>
            <Field label="Condition">
              <select
                name="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 text-sm"
              >
                {CONDITIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand (optional)">
              <Input
                name="brand"
                placeholder="e.g. Apple, Nike, IKEA"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </Field>
            <Field label="Location label">
              <Input
                name="location"
                placeholder="Location"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="City">
            <Input
              name="city"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </Field>

          <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <input
              type="checkbox"
              checked={isDistressSale}
              onChange={(e) => setIsDistressSale(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--brand)]"
              data-testid="new-listing-distress"
            />
            <span>
              <span className="block text-sm font-semibold text-zinc-950">Mark as a distress sale</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Selling urgently (relocating, need quick cash)? We&apos;ll highlight it to buyers looking for fast deals.
              </span>
            </span>
          </label>

          <Field label="Category (optional)">
            <p className="text-xs text-zinc-500">Auto-tagged later. You can refine before publishing.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span key={cat} className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{cat}</span>
              ))}
            </div>
          </Field>
        </article>

        <aside className="space-y-6">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h3 className="text-base font-semibold text-zinc-950">Photos</h3>
            <p className="mt-1 text-xs text-zinc-500">Upload clear photos from your device. The first photo is used as the cover.</p>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center transition hover:border-brand">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
                data-testid="new-listing-files"
              />
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              ) : (
                <ImagePlus className="h-6 w-6 text-zinc-400" />
              )}
              <span className="text-sm font-semibold text-zinc-700">{uploading ? "Uploading…" : "Tap to upload photos"}</span>
              <span className="text-xs text-zinc-400">PNG, JPG or WEBP · up to 10 images</span>
            </label>

            {images.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Listing image ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 ? (
                      <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-foreground">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCover(i)}
                        className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                      >
                        Make cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="Remove image"
                      className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>

          {error && <p className="rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || uploading || !title || !description || !priceNgn || images.length === 0}
            data-testid="new-listing-submit"
          >
            {submitting ? "Saving…" : "Submit for moderation"}
          </Button>
          <p className="text-center text-xs text-zinc-500">
            New listings are reviewed before going live. You&apos;ll see them in the Draft tab until then.
          </p>
        </aside>
      </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
