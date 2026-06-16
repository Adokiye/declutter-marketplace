import { Suspense } from "react";
import { MarketplaceBrowser } from "./marketplace-browser";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MarketplacePage() {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <MarketplaceBrowser />
      </Suspense>
      <SiteFooter />
    </>
  );
}
