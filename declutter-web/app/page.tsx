import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Storefront } from "@/components/storefronts";
import { api } from "@/lib/api";
import { getActiveTheme } from "@/lib/theme";
import type { Category, Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const theme = getActiveTheme();

  let fresh: Listing[] = [];
  let distress: Listing[] = [];
  let bestDeals: Listing[] = [];
  let categories: Category[] = [];
  try {
    const [freshRes, distressRes, dealsRes, cats] = await Promise.all([
      api.listings.search({ limit: 8, sort: "newest" }),
      api.listings.search({ limit: 8, sort: "newest", isDistressSale: "true" }),
      api.listings.search({ limit: 8, sort: "newest", isGoodDeal: "true" }),
      api.categories.list()
    ]);
    fresh = freshRes.results;
    distress = distressRes.results;
    bestDeals = dealsRes.results;
    categories = cats;
  } catch {
    // API unavailable at build/preview time — render the themed shell with empty data.
  }

  return (
    <>
      <SiteHeader />
      <Storefront theme={theme} categories={categories} fresh={fresh} distress={distress} bestDeals={bestDeals} />
      <SiteFooter />
    </>
  );
}
