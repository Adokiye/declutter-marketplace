"use client";

import { useEffect, useState } from "react";
import { Banknote, ChevronLeft, ChevronRight, Settings, ShieldCheck, Tag, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api, ApiError } from "@/lib/api";
import type { Paginated, User } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const adminNav = [
  { href: "/dashboard", label: "Overview", icon: ShieldCheck },
  { href: "/dashboard/users", label: "Users", icon: UsersIcon },
  { href: "/dashboard/listings", label: "Listings", icon: Tag },
  { href: "/dashboard/escrows", label: "Escrows", icon: Banknote },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<User> | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.users.list({ page, limit: 20 });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load users");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function toggleBan(user: User) {
    setPendingId(user.id);
    try {
      const updated = user.isBanned ? await api.admin.unbanUser(user.id) : await api.admin.banUser(user.id);
      setData((current) => current && { ...current, results: current.results.map((u) => (u.id === updated.id ? updated : u)) });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Admin console" }}
      nav={adminNav}
      title="Users"
      subtitle="Ban or unban accounts. Verified phone numbers can sign in immediately."
      requireRole="admin"
    >
      {error && <p className="mb-4 rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">{error}</p>}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Last login</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(data?.results ?? []).map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  <p className="font-semibold text-zinc-950">
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone}
                  </p>
                  <p className="text-xs text-zinc-500">{user.email ?? user.phone}</p>
                </td>
                <td className="px-6 py-4 capitalize text-zinc-700">{user.role}</td>
                <td className="px-6 py-4">
                  {user.isBanned ? (
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Banned</span>
                  ) : user.isPhoneVerified ? (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Verified</span>
                  ) : (
                    <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700">Unverified</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">{formatDateTime(user.lastLoginAt)}</td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant={user.isBanned ? "default" : "secondary"}
                    size="sm"
                    disabled={pendingId === user.id}
                    onClick={() => toggleBan(user)}
                    data-testid={`toggle-ban-${user.phone.replace(/[^\d]/g, "")}`}
                  >
                    {user.isBanned ? "Unban" : "Ban"}
                  </Button>
                </td>
              </tr>
            ))}
            {(!data || data.results.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {data && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Page {data.page} of {Math.max(data.totalPages, 1)}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={!data.hasPrev} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="secondary" size="sm" disabled={!data.hasNext} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
