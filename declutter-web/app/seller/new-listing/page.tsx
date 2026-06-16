import { NewListing } from "./new-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NewListingPage() {
  return (
    <>
      <SiteHeader />
      <NewListing />
      <SiteFooter />
    </>
  );
}
