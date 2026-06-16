import { Banknote, LayoutDashboard, PackagePlus, ShoppingBag, Tag } from "lucide-react";

export const sellerNav = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard },
  { href: "/seller/listings", label: "Listings", icon: Tag },
  { href: "/seller/orders", label: "Orders", icon: ShoppingBag },
  { href: "/seller/new-listing", label: "New listing", icon: PackagePlus },
  { href: "/seller/payouts", label: "Payouts", icon: Banknote }
];
