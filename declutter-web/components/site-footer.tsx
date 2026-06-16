import Link from "next/link";
import { Instagram, ShieldCheck, Store, Twitter } from "lucide-react";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Browse listings", href: "/marketplace" },
      { label: "Categories", href: "/marketplace" },
      { label: "How it works", href: "/marketplace" }
    ]
  },
  {
    title: "Sell",
    links: [
      { label: "Start selling", href: "/seller/new-listing" },
      { label: "Seller dashboard", href: "/seller" },
      { label: "Your orders", href: "/seller/orders" }
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/marketplace" },
      { label: "Buyer protection", href: "/marketplace" },
      { label: "Contact us", href: "mailto:support@declutter.ng" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-surface">
      <div className="mx-auto w-full max-w-7xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-zinc-950">
              <span className="grid h-9 w-9 place-items-center rounded-brand bg-brand text-brand-foreground">
                <Store className="h-4 w-4" />
              </span>
              Declutter
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">
              Lagos&rsquo; peer-to-peer marketplace for pre-loved items. Verified sellers, transparent commission, buyer protection.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-zinc-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Protected checkout
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-600">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-zinc-950">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Declutter. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="hover:text-zinc-950">Terms</Link>
            <Link href="/marketplace" className="hover:text-zinc-950">Privacy</Link>
            <a href="https://instagram.com" aria-label="Instagram" className="hover:text-zinc-950"><Instagram className="h-4 w-4" /></a>
            <a href="https://twitter.com" aria-label="Twitter" className="hover:text-zinc-950"><Twitter className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
