// Curated Unsplash photos used across the marketplace. UI chrome stays
// monochrome but photographic content renders in full color.

const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const fallbackListingImage = u("1555041469-a586c61ea9bc", 1200);

export const heroImages = {
  // Login + marketplace hero band
  loginHero: u("1556910103-1c02745aae4d"), // moody Lagos interior
  workspace: u("1497366216548-37526070297c"),
  livingRoom: u("1505691938895-1758d7feb511"),
  marketStall: u("1542838132-92c53300491e"),
  electronics: u("1567721913486-6585f069b332"),
  sneakers: u("1542291026-7eec264c27ff"),
  furniture: u("1555041469-a586c61ea9bc"),
  table: u("1533090481720-856c6e3c1fdc"),
  chair: u("1592078615290-033ee584e267"),
  weekenderBag: u("1594223274512-ad4803739b7c"),
  pilates: u("1593811167562-9cef47bfc4d7"),
  iphone: u("1695048133142-1a20484d2569")
};

export const collageStrip = [
  heroImages.furniture,
  heroImages.iphone,
  heroImages.sneakers,
  heroImages.weekenderBag,
  heroImages.table
];

export const emptyState = {
  marketplace: u("1493663284031-b7e3aefcae8e"), // empty mid-century shelf
  orders: u("1521791136064-7986c2920216"), // hand holding receipt
  listings: u("1542838132-92c53300491e") // empty market stall
};
