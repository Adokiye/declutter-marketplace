"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Store,
  Tag,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Category } from "@/lib/types";

export function SiteHeader({ variant = "default" }: { variant?: "default" | "minimal" }) {
  const router = useRouter();
  const { user, signOut, hydrated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [term, setTerm] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const catsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    api.categories
      .list()
      .then((list) => active && setCategories(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !catsOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuOpen && !menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
      if (catsOpen && !catsRef.current?.contains(event.target as Node)) setCatsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, catsOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
    setMobileOpen(false);
  }

  return (
    <header
      className={`${variant === "minimal" ? "relative" : "sticky top-0"} z-30 border-b border-zinc-200 bg-surface/95 backdrop-blur`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-3.5 lg:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-black tracking-tight text-zinc-950">
          <span className="grid h-9 w-9 place-items-center rounded-brand bg-brand text-brand-foreground">
            <Store className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Declutter</span>
        </Link>

        {variant === "default" && (
          <>
            {/* Categories dropdown */}
            <div className="relative hidden lg:block" ref={catsRef}>
              <button
                onClick={() => setCatsOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
                aria-expanded={catsOpen}
                aria-haspopup="menu"
              >
                <Menu className="h-4 w-4" /> Categories <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {catsOpen && (
                <div role="menu" className="absolute left-0 mt-2 grid w-64 grid-cols-1 gap-0.5 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
                  <Link href="/marketplace" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-zinc-50" onClick={() => setCatsOpen(false)}>
                    All listings
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/marketplace?categoryId=${c.id}`}
                      className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      onClick={() => setCatsOpen(false)}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <form onSubmit={submitSearch} className="relative hidden flex-1 md:block" role="search">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search listings, brands, categories…"
                aria-label="Search listings"
                data-testid="header-search"
                className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-11 pr-24 text-sm outline-none transition focus:border-brand focus:bg-white"
              />
              <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2">
                Search
              </Button>
            </form>
          </>
        )}

        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          {variant === "default" && (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/seller/new-listing"><Tag className="h-4 w-4" /> Sell</Link>
            </Button>
          )}

          {!hydrated ? (
            <span className="h-9 w-24 animate-pulse rounded-full bg-zinc-100" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-zinc-200 px-2 py-1.5 sm:px-3"
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                data-testid="header-user-menu"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                  {(user.firstName ?? user.phone).slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-zinc-900 sm:inline">
                  {user.firstName ?? user.phone}
                </span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  data-testid="header-user-menu-dropdown"
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white py-2 shadow-lg"
                >
                  <Link href="/orders" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-50" role="menuitem" data-testid="header-menu-orders" onClick={() => setMenuOpen(false)}>
                    <ShoppingBag className="h-4 w-4" /> My orders
                  </Link>
                  <Link href="/seller" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-50" role="menuitem" data-testid="header-menu-seller" onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> Seller dashboard
                  </Link>
                  <Link href="/seller/orders" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-50" role="menuitem" onClick={() => setMenuOpen(false)}>
                    <Package className="h-4 w-4" /> Seller orders
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-50" role="menuitem" onClick={() => setMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Admin console
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                      window.location.assign("/login");
                    }}
                    className="mt-1 flex w-full items-center gap-3 border-t border-zinc-100 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    role="menuitem"
                    data-testid="header-menu-signout"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm" data-testid="header-sign-in">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          {variant === "default" && (
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full border border-zinc-200 md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile panel */}
      {variant === "default" && mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-5 py-4 md:hidden">
          <form onSubmit={submitSearch} className="relative" role="search">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search listings…"
              aria-label="Search listings"
              className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm outline-none focus:border-brand focus:bg-white"
            />
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/marketplace" className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold" onClick={() => setMobileOpen(false)}>
              Browse all
            </Link>
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                href={`/marketplace?categoryId=${c.id}`}
                className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700"
                onClick={() => setMobileOpen(false)}
              >
                {c.name}
              </Link>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href="/seller/new-listing" onClick={() => setMobileOpen(false)}><Tag className="h-4 w-4" /> Sell an item</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
