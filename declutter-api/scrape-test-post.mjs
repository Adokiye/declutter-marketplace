import { chromium } from "playwright";

const url = "https://www.instagram.com/declutterdotcom/p/DY5SoYrN0Hr/";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(2000);

  console.log("title:", await page.title());
  console.log("url after redirect:", page.url());

  const ogDesc = await page.$eval("meta[property='og:description']", (m) => m.getAttribute("content")).catch(() => null);
  console.log("og:description:", JSON.stringify(ogDesc));

  const ogImage = await page.$eval("meta[property='og:image']", (m) => m.getAttribute("content")).catch(() => null);
  console.log("og:image:", ogImage);

  const ogTitle = await page.$eval("meta[property='og:title']", (m) => m.getAttribute("content")).catch(() => null);
  console.log("og:title:", JSON.stringify(ogTitle));

  const imgs = await page.$$eval("img", (els) =>
    els.map((i) => i.src).filter((s) => s && !s.startsWith("data:")).slice(0, 10)
  );
  console.log("imgs found:", imgs.length);
  imgs.forEach((s) => console.log("  -", s.slice(0, 120)));

  await page.screenshot({ path: "/tmp/ig-post.png" });
} finally {
  await browser.close();
}
