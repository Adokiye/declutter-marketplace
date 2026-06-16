import { chromium } from "playwright";

const profileUrl = process.argv[2] || "https://www.instagram.com/declutterdotcom";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log("title:", title);
  console.log("url:", page.url());

  const hrefs = await page.$$eval("a[href*='/p/'], a[href*='/reel/']", (links) =>
    Array.from(new Set(links.map((a) => a.href))).slice(0, 10)
  );
  console.log("post hrefs found:", hrefs.length);
  hrefs.forEach((h) => console.log("  -", h));

  const ogDesc = await page.$eval("meta[property='og:description']", (m) => m.getAttribute("content")).catch(() => null);
  console.log("og:description:", ogDesc?.slice(0, 200));

  const bodyText = await page.$eval("body", (b) => b.innerText.slice(0, 400)).catch(() => "");
  console.log("\n--- body snippet ---\n" + bodyText);

  await page.screenshot({ path: "/tmp/ig-declutter.png", fullPage: false });
  console.log("\nscreenshot: /tmp/ig-declutter.png");
} finally {
  await browser.close();
}
