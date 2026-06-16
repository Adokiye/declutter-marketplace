import { Checkout } from "./checkout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function CheckoutPage({
  params
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return (
    <>
      <SiteHeader variant="minimal" />
      <Checkout listingId={listingId} />
      <SiteFooter />
    </>
  );
}
