"use client";

import { useEffect, useState } from "react";
import { Check, Instagram, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import type { Business } from "@/lib/types";

type RowState = { url: string; enabled: boolean; saving: boolean; syncing: boolean; note?: string };

export function InstagramBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.businesses
      .list({ limit: 50 })
      .then((res) => {
        if (!active) return;
        setBusinesses(res.results);
        setRows(
          Object.fromEntries(
            res.results.map((b) => [b.id, { url: b.igProfileUrl ?? "", enabled: !!b.igImportEnabled, saving: false, syncing: false }])
          )
        );
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : "Could not load businesses"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function patchRow(id: string, patch: Partial<RowState>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function save(b: Business) {
    const row = rows[b.id];
    patchRow(b.id, { saving: true, note: undefined });
    try {
      await api.businesses.updateSettings(b.id, {
        igProfileUrl: row.url.trim() || null,
        igImportEnabled: row.enabled
      } as Partial<Business>);
      patchRow(b.id, { note: "Saved" });
      setTimeout(() => patchRow(b.id, { note: undefined }), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      patchRow(b.id, { saving: false });
    }
  }

  async function syncNow(b: Business) {
    patchRow(b.id, { syncing: true, note: undefined });
    try {
      await api.instagram.sync(b.id, 6);
      patchRow(b.id, { note: "Sync queued — new posts appear shortly" });
      setTimeout(() => patchRow(b.id, { note: undefined }), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start sync");
    } finally {
      patchRow(b.id, { syncing: false });
    }
  }

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950">
        <Instagram className="h-5 w-5" /> Instagram import
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Set each business&apos;s Instagram profile and sync its posts. Scraped posts publish live and keep their original post date.
      </p>

      {loading ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-zinc-100" />
      ) : businesses.length === 0 ? (
        <p className="mt-5 text-sm text-zinc-500">No businesses yet.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {businesses.map((b) => {
            const row = rows[b.id];
            if (!row) return null;
            return (
              <div key={b.id} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-950">{b.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${b.igProfileUrl ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {b.igProfileUrl ? "URL set" : "No URL"}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={row.url}
                    onChange={(e) => patchRow(b.id, { url: e.target.value })}
                    placeholder="https://www.instagram.com/yourshop"
                    className="h-10 flex-1 rounded-full border border-zinc-200 px-4 text-sm outline-none focus:border-brand"
                    data-testid={`ig-url-${b.id}`}
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={row.enabled} onChange={(e) => patchRow(b.id, { enabled: e.target.checked })} className="h-4 w-4 accent-[color:var(--brand)]" />
                    Import enabled
                  </label>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={() => save(b)} disabled={row.saving}>
                    {row.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => syncNow(b)} disabled={row.syncing || !row.url.trim() || !row.enabled}>
                    {row.syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
                  </Button>
                  {row.note && <span className="text-xs text-emerald-700">{row.note}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-zinc-700">{error}</p>}
    </article>
  );
}
