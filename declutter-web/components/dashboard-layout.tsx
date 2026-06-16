"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Bell, ChevronRight, Loader2, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type Crumb = { label: string; href?: string };

export function DashboardLayout({
  brand,
  nav,
  children,
  title,
  subtitle,
  crumbs,
  requireRole,
  actions
}: {
  brand: { name: string; tagline?: string };
  nav: NavItem[];
  children: ReactNode;
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  requireRole?: "seller" | "admin";
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated, signOut } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace(`/login?next=${pathname}`);
  }, [hydrated, user, router, pathname]);

  if (!hydrated || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-50">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </main>
    );
  }

  if (requireRole && user.role !== requireRole && user.role !== "admin") {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <p className="text-lg font-semibold text-zinc-900">Access denied</p>
        <p className="mt-2 text-sm text-zinc-500">
          You need {requireRole} privileges to access this area.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/marketplace">Back to marketplace</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="mx-auto grid w-full max-w-[1400px] gap-0 lg:grid-cols-[256px_1fr]">
        <aside className="hidden border-r border-zinc-200 bg-white px-6 py-8 lg:block">
          <Link href="/" className="mb-10 flex items-center gap-3 text-lg font-black tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-brand bg-brand text-brand-foreground">
              <Store className="h-4 w-4" />
            </span>
            <span>
              {brand.name}
              {brand.tagline && (
                <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  {brand.tagline}
                </span>
              )}
            </span>
          </Link>
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
                    active ? "bg-brand text-brand-foreground" : "text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", active ? "bg-white text-black" : "bg-zinc-900 text-white")}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-10 border-t border-zinc-100 pt-6 text-xs text-zinc-500">
            <p className="font-semibold text-zinc-700">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone}</p>
            <p>{user.email ?? user.phone}</p>
            <button
              onClick={() => {
                signOut();
                router.push("/login");
              }}
              className="mt-4 inline-flex items-center gap-2 text-zinc-700 hover:text-black"
              data-testid="dashboard-log-out"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </aside>

        <section className="p-6 md:p-10">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {crumbs && (
                <nav className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  {crumbs.map((crumb, i) => (
                    <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                      {crumb.href ? (
                        <Link href={crumb.href} className="hover:text-black">{crumb.label}</Link>
                      ) : (
                        <span className="text-zinc-700">{crumb.label}</span>
                      )}
                      {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
                    </span>
                  ))}
                </nav>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <Input placeholder="Search…" className="w-64" />
              </div>
              <button className="grid h-11 w-11 place-items-center rounded-full border border-zinc-200 bg-white">
                <Bell className="h-4 w-4 text-zinc-600" />
              </button>
              {actions}
            </div>
          </header>

          <div className="mt-8">{children}</div>
        </section>
      </section>
    </main>
  );
}
