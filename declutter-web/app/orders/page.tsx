import { OrdersList } from "./orders-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function OrdersPage() {
  return (
    <>
      <SiteHeader />
      <OrdersList />
      <SiteFooter />
    </>
  );
}
