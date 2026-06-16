"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StorefrontSearch({
  placeholder = "Search for any product or brand",
  className = "",
  tone = "light"
}: {
  placeholder?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : "/marketplace");
  }

  return (
    <form onSubmit={submit} className={`relative flex items-center gap-2 ${className}`} role="search">
      <div className="relative flex-1">
        <Search className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${tone === "dark" ? "text-white/60" : "text-zinc-500"}`} />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          aria-label="Search listings"
          data-testid="home-search"
          className={`h-12 w-full rounded-full pl-11 pr-4 text-sm outline-none transition ${
            tone === "dark"
              ? "border border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:border-white/50"
              : "border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-brand focus:bg-white"
          }`}
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}
